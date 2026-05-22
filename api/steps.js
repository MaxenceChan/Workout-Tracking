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

// Plusieurs sources interrogées en parallèle + max par jour pour avoir les données les
// plus complètes. merge_step_deltas = live, estimated_steps = plus complet sur l'historique,
// dataTypeName = auto-merge fait par Google (filet de sécurité).
const STEP_SOURCES = [
  "derived:com.google.step_count.delta:com.google.android.gms:merge_step_deltas",
  "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps",
];

async function fetchFromGoogleFit(fitness, startMs, endMs) {
  const baseReq = {
    bucketByTime: { period: { type: "day", value: 1, timeZoneId: "Europe/Paris" } },
    startTimeMillis: startMs,
    endTimeMillis: endMs,
  };

  const calls = STEP_SOURCES.map(dataSourceId =>
    fitness.users.dataset.aggregate({
      userId: "me",
      requestBody: { aggregateBy: [{ dataSourceId }], ...baseReq },
    }).catch(e => {
      const msg = String(e?.message || "");
      // DataSourceId absent pour cet user : on ignore cette source, on garde les autres
      if (msg.includes("DataSourceId") || msg.includes("dataSource")) return null;
      throw e;
    })
  );

  // Fallback : auto-merge par Google sur le type de donnée
  calls.push(
    fitness.users.dataset.aggregate({
      userId: "me",
      requestBody: { aggregateBy: [{ dataTypeName: "com.google.step_count.delta" }], ...baseReq },
    }).catch(() => null)
  );

  const responses = await Promise.all(calls);
  const valid = responses.filter(r => r && r.data);
  if (valid.length === 0) throw new Error("ALL_SOURCES_FAILED");
  return valid;
}

// Buckets alignés Paris (timeZoneId fourni à l'API) → 1 bucket = 1 jour Paris
function parseBuckets(responses) {
  const dayMap = new Map();
  for (const response of responses) {
    for (const bucket of response.data.bucket || []) {
      const date = toParisDate(Number(bucket.startTimeMillis));
      let bucketSteps = 0;
      for (const dataset of bucket.dataset || []) {
        for (const point of dataset.point || []) {
          bucketSteps += (point.value?.[0]?.intVal || 0);
        }
      }
      // Max entre les sources pour ce jour
      dayMap.set(date, Math.max(dayMap.get(date) || 0, bucketSteps));
    }
  }
  return [...dayMap.entries()].map(([date, steps]) => ({ date, steps }));
}

function fillGaps(steps) {
  const map = new Map(steps.map(d => [d.date, d.steps]));
  // Aujourd'hui Paris toujours présent (même à 0 → la courbe arrive jusqu'à aujourd'hui)
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

export default async function handler(req, res) {
  try {
    const { uid, debug } = req.query;
    if (!uid) return res.status(200).json({ ok: true });

    if (!checkRateLimit(uid)) {
      return res.status(429).json({ error: "RATE_LIMITED" });
    }

    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return res.status(404).json({ error: "User not found" });

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

    const now = Date.now();
    const startMs = now - HISTORY_DAYS * DAY_MS;
    const endMs   = now + DAY_MS;

    let freshSteps;
    let debugInfo = null;
    try {
      const responses = await fetchFromGoogleFit(fitness, startMs, endMs);
      freshSteps = parseBuckets(responses);
      if (debug === "1") {
        debugInfo = {
          sourcesQueried: STEP_SOURCES.length + 1,
          sourcesReturned: responses.length,
          freshLastDates: freshSteps.slice(-7).map(s => `${s.date}:${s.steps}`),
        };
      }
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
