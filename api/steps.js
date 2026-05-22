import admin from "./lib/firebaseAdmin.js";
import { google } from "googleapis";

const DAY_MS = 86400000;
const HISTORY_DAYS = 730;

// Rate limit in-memory : 30 req/min/uid
const rateLimit = new Map();
const RL_WINDOW_MS = 60 * 1000;
const RL_MAX = 30;

function checkRateLimit(uid) {
  const now = Date.now();
  const entry = rateLimit.get(uid) || { count: 0, windowStart: now };
  if (now - entry.windowStart > RL_WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count++;
  rateLimit.set(uid, entry);
  if (rateLimit.size > 200) {
    for (const [k, v] of rateLimit) {
      if (now - v.windowStart > RL_WINDOW_MS * 5) rateLimit.delete(k);
    }
  }
  return entry.count <= RL_MAX;
}

const toParisDate = (ms) =>
  new Date(ms).toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });

// UTC ms de minuit Europe/Paris pour une date YYYY-MM-DD (DST-aware)
const parisMidnight = (dateStr) => {
  const ref = new Date(`${dateStr}T00:00:00Z`);
  const parisLocal = new Date(ref.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  return ref.getTime() - parisLocal.getHours() * 3_600_000;
};

// Plusieurs sources en parallèle, max par jour : un capteur foireux ou une source
// incomplète n'efface jamais les bonnes données.
const STEP_SOURCES = [
  "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps",
  "derived:com.google.step_count.delta:com.google.android.gms:merge_step_deltas",
];

async function fetchFromGoogleFit(fitness, startMs, endMs) {
  const baseReq = {
    bucketByTime: { durationMillis: DAY_MS },
    startTimeMillis: startMs,
    endTimeMillis: endMs,
  };

  // Une source qui erreur (timeout, 429, source absente) ne casse pas les autres.
  // Seules les erreurs d'auth remontent (pour déclencher needs_reauth en amont).
  const tolerant = (promise) => promise.catch(e => {
    const msg = String(e?.message || "").toLowerCase();
    const status = e?.response?.status || e?.code;
    if (status === 401 || msg.includes("invalid_grant")) throw e;
    return null;
  });

  const calls = STEP_SOURCES.map(dataSourceId =>
    tolerant(fitness.users.dataset.aggregate({
      userId: "me",
      requestBody: { aggregateBy: [{ dataSourceId }], ...baseReq },
    }))
  );

  calls.push(
    tolerant(fitness.users.dataset.aggregate({
      userId: "me",
      requestBody: { aggregateBy: [{ dataTypeName: "com.google.step_count.delta" }], ...baseReq },
    }))
  );

  const responses = await Promise.all(calls);
  const valid = responses.filter(r => r && r.data);
  if (valid.length === 0) throw new Error("ALL_SOURCES_FAILED");
  return valid;
}

// Réassignation point par point sur la date Paris (gère DST + chevauchements de bucket).
// Pour chaque source on construit sa propre map jour->pas, puis on prend le max entre sources.
function parseBuckets(responses) {
  const perSourceMaps = [];

  for (const response of responses) {
    const dayMap = new Map();
    for (const bucket of response.data.bucket || []) {
      const bucketDate = toParisDate(Number(bucket.startTimeMillis));
      if (!dayMap.has(bucketDate)) dayMap.set(bucketDate, 0);
      for (const dataset of bucket.dataset || []) {
        for (const point of dataset.point || []) {
          const ms = Number(point.startTimeNanos) / 1e6 || Number(bucket.startTimeMillis);
          const date = toParisDate(ms);
          dayMap.set(date, (dayMap.get(date) || 0) + (point.value?.[0]?.intVal || 0));
        }
      }
    }
    perSourceMaps.push(dayMap);
  }

  const finalMap = new Map();
  for (const sourceMap of perSourceMaps) {
    for (const [date, steps] of sourceMap) {
      finalMap.set(date, Math.max(finalMap.get(date) || 0, steps));
    }
  }
  return [...finalMap.entries()].map(([date, steps]) => ({ date, steps }));
}

function fillGaps(steps) {
  const map = new Map(steps.map(d => [d.date, d.steps]));
  // Aujourd'hui Paris toujours présent (la courbe arrive jusqu'à la date du jour)
  const todayParis = toParisDate(Date.now());
  if (!map.has(todayParis)) map.set(todayParis, 0);

  if (map.size < 2) {
    return [...map.entries()].map(([date, steps]) => ({ date, steps }));
  }

  const sorted = [...map.keys()].sort();
  const filled = [];
  let cur = sorted[0];
  const last = sorted[sorted.length - 1];
  while (cur <= last) {
    filled.push({ date: cur, steps: map.get(cur) ?? 0 });
    const [y, m, dd] = cur.split("-").map(Number);
    cur = new Date(Date.UTC(y, m - 1, dd + 1)).toISOString().slice(0, 10);
  }
  return filled;
}

// max(fresh, cached) par jour : ne wipe jamais l'historique
function mergeWithCache(cached, fresh) {
  const merged = new Map(cached.map(d => [d.date, d.steps]));
  for (const { date, steps } of fresh) {
    merged.set(date, Math.max(steps, merged.get(date) ?? 0));
  }
  return [...merged.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, steps]) => ({ date, steps }));
}

// Debug helper : retourne par source les pas des 10 derniers jours
function buildDebugInfo(responses) {
  return responses.map((r, idx) => {
    const map = new Map();
    for (const bucket of r.data.bucket || []) {
      const bucketDate = toParisDate(Number(bucket.startTimeMillis));
      if (!map.has(bucketDate)) map.set(bucketDate, 0);
      for (const ds of bucket.dataset || []) {
        for (const p of ds.point || []) {
          const ms = Number(p.startTimeNanos) / 1e6 || Number(bucket.startTimeMillis);
          const date = toParisDate(ms);
          map.set(date, (map.get(date) || 0) + (p.value?.[0]?.intVal || 0));
        }
      }
    }
    const entries = [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-10);
    return {
      source: idx < STEP_SOURCES.length ? STEP_SOURCES[idx].split(":").pop() : "auto-merge",
      last10: entries.map(([d, s]) => `${d}:${s}`),
    };
  });
}

export default async function handler(req, res) {
  try {
    const { uid, debug, reset } = req.query;
    if (!uid) return res.status(200).json({ ok: true });

    if (!checkRateLimit(uid)) {
      return res.status(429).json({ error: "RATE_LIMITED" });
    }

    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return res.status(404).json({ error: "User not found" });

    // ?reset=1 → wipe le stepsCache pour repartir from scratch (debug)
    if (reset === "1") {
      await userRef.set({ stepsCache: admin.firestore.FieldValue.delete() }, { merge: true });
      return res.status(200).json({ reset: true });
    }

    const userData = userSnap.data();
    const { refresh_token } = userData.googleFit || {};
    const cachedSteps = Array.isArray(userData.stepsCache?.steps)
      ? userData.stepsCache.steps : [];

    if (!refresh_token) {
      return res.status(200).json({ connected: false, needsReauth: false, steps: cachedSteps });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token });
    const fitness = google.fitness({ version: "v1", auth: oauth2Client });

    // startMs/endMs alignés sur minuit Paris (proven approach, géré DST)
    const startMs = parisMidnight(toParisDate(Date.now() - HISTORY_DAYS * DAY_MS)) - DAY_MS;
    const endMs   = parisMidnight(toParisDate(Date.now() + DAY_MS));

    let freshSteps;
    let debugInfo = null;
    try {
      const responses = await fetchFromGoogleFit(fitness, startMs, endMs);
      freshSteps = parseBuckets(responses);
      if (debug === "1") debugInfo = buildDebugInfo(responses);
    } catch (error) {
      const msg    = String(error?.message || "").toLowerCase();
      const apiErr = error?.response?.data?.error;
      const status = error?.response?.status || error?.code;
      if (apiErr === "invalid_grant" || msg.includes("invalid_grant") || status === 401) {
        await userRef.set({ googleFit: { needs_reauth: true } }, { merge: true });
        return res.status(200).json({ needsReauth: true, steps: cachedSteps });
      }
      console.error("Steps fetch error:", error);
      return res.status(200).json({ connected: true, needsReauth: false, steps: cachedSteps, stale: true });
    }

    const merged = mergeWithCache(cachedSteps, freshSteps);
    const allSteps = fillGaps(merged);

    const cachedMap = new Map(cachedSteps.map(d => [d.date, d.steps]));
    const hasChanges =
      allSteps.length !== cachedSteps.length ||
      allSteps.some(s => cachedMap.get(s.date) !== s.steps);

    if (hasChanges) {
      await userRef.set(
        { stepsCache: { steps: allSteps, updatedAt: admin.firestore.FieldValue.serverTimestamp() } },
        { merge: true }
      );
    }

    const payload = { connected: true, needsReauth: false, steps: allSteps };
    if (debugInfo) payload.debug = debugInfo;
    return res.status(200).json(payload);
  } catch (e) {
    console.error("Steps error:", e);
    return res.status(500).json({ error: "Failed to fetch steps" });
  }
}
