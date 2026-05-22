import admin from "./lib/firebaseAdmin.js";
import { google } from "googleapis";

const DAY_MS = 86400000;
const HISTORY_DAYS = 365;       // Fetch full 1 an au premier login / reset / ?full=1
const FRESH_WINDOW_DAYS = 14;   // Polls de routine : seulement 14 derniers jours (le reste vient du cache via merge max)
const MAX_CHUNK_DAYS = 30;      // Google Fit refuse les windows > ~90j ("aggregate duration too large")
const MAX_CHUNK_MS = MAX_CHUNK_DAYS * DAY_MS;

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
  const errors = [];
  const tolerant = (label, promise) => promise.catch(e => {
    const msg = String(e?.message || "");
    const status = e?.response?.status || e?.code;
    const apiErr = e?.response?.data?.error;
    if (status === 401 || msg.toLowerCase().includes("invalid_grant")) throw e;
    const info = {
      source: label,
      status: status || null,
      apiError: apiErr || null,
      message: msg.slice(0, 300),
    };
    errors.push(info);
    console.error(`[steps][${label}]`, JSON.stringify(info));
    return null;
  });

  // Découpage de la fenêtre en chunks de MAX_CHUNK_DAYS jours (Google Fit refuse les fenêtres trop larges)
  const chunks = [];
  for (let cur = startMs; cur < endMs; cur += MAX_CHUNK_MS) {
    chunks.push({ startMs: cur, endMs: Math.min(cur + MAX_CHUNK_MS, endMs) });
  }

  // Toutes les combinaisons (source × chunk) en parallèle
  const allRequests = [];
  for (const dataSourceId of STEP_SOURCES) {
    const label = dataSourceId.split(":").pop();
    for (const c of chunks) {
      allRequests.push({
        label,
        body: {
          aggregateBy: [{ dataSourceId }],
          bucketByTime: { durationMillis: DAY_MS },
          startTimeMillis: c.startMs,
          endTimeMillis: c.endMs,
        },
      });
    }
  }
  for (const c of chunks) {
    allRequests.push({
      label: "auto-merge",
      body: {
        aggregateBy: [{ dataTypeName: "com.google.step_count.delta" }],
        bucketByTime: { durationMillis: DAY_MS },
        startTimeMillis: c.startMs,
        endTimeMillis: c.endMs,
      },
    });
  }

  const responses = await Promise.all(
    allRequests.map(req =>
      tolerant(req.label, fitness.users.dataset.aggregate({ userId: "me", requestBody: req.body }))
    )
  );

  // Regroupement des buckets par source label → une "réponse virtuelle" par source
  const bySource = new Map();
  responses.forEach((r, i) => {
    if (!r || !r.data) return;
    const label = allRequests[i].label;
    if (!bySource.has(label)) bySource.set(label, []);
    bySource.get(label).push(...(r.data.bucket || []));
  });

  if (bySource.size === 0) {
    const err = new Error("ALL_SOURCES_FAILED");
    err.sourceErrors = errors;
    throw err;
  }

  const groupedResponses = [...bySource.values()].map(buckets => ({ data: { bucket: buckets } }));
  return { responses: groupedResponses, sourceErrors: errors };
}

// Réassignation point par point sur la date Paris (gère DST + chevauchements de bucket).
// Pour chaque source on construit sa map jour->pas, puis on prend la MÉDIANE des valeurs
// non-nulles entre sources (ignore les sources qui ont raté ce jour, ignore l'outlier inflated).
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

  const allDates = new Set();
  for (const m of perSourceMaps) for (const d of m.keys()) allDates.add(d);

  const finalMap = new Map();
  for (const date of allDates) {
    const values = perSourceMaps
      .map(m => m.get(date))
      .filter(v => v !== undefined && v > 0)
      .sort((a, b) => a - b);

    if (values.length === 0) {
      finalMap.set(date, 0);
    } else if (values.length === 1) {
      finalMap.set(date, values[0]);
    } else {
      const mid = Math.floor(values.length / 2);
      finalMap.set(
        date,
        values.length % 2 === 0
          ? Math.round((values[mid - 1] + values[mid]) / 2)
          : values[mid]
      );
    }
  }
  return [...finalMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, steps]) => ({ date, steps }));
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

// Fresh prime sur cached, sauf si fresh=0 pour un jour qui avait déjà des données
// (= panne API partielle → on protège l'historique mais on laisse passer les vraies corrections vers le bas).
function mergeWithCache(cached, fresh) {
  const merged = new Map(cached.map(d => [d.date, d.steps]));
  for (const { date, steps } of fresh) {
    const existing = merged.get(date);
    if (steps > 0 || existing === undefined) {
      merged.set(date, steps);
    }
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

    // Fetch différentiel : recent uniquement si cache existant ET récent ET sans trou possible
    const cacheTs = userData.stepsCache?.updatedAt?.toMillis?.() || 0;
    const cacheAgeMs = Date.now() - cacheTs;

    // Dernière date présente dans le cache (sécurité supplémentaire : on couvre toujours la
    // fenêtre depuis cette date, même si updatedAt a été touché récemment sans nouvelles données)
    const lastCacheDate = cachedSteps.length > 0 ? cachedSteps[cachedSteps.length - 1].date : null;
    const lastCacheMs = lastCacheDate ? new Date(lastCacheDate + "T00:00:00Z").getTime() : 0;
    const lastDateAgeMs = Date.now() - lastCacheMs;

    const forceFull = req.query.full === "1";
    const useRecentOnly = !forceFull
      && cachedSteps.length > FRESH_WINDOW_DAYS
      && cacheAgeMs < FRESH_WINDOW_DAYS * DAY_MS
      && lastDateAgeMs < FRESH_WINDOW_DAYS * DAY_MS;

    // Fenêtre couvre le max entre FRESH_WINDOW et l'âge réel de la dernière donnée (sécurité)
    const lookbackDays = useRecentOnly
      ? Math.max(FRESH_WINDOW_DAYS, Math.ceil(lastDateAgeMs / DAY_MS) + 1)
      : HISTORY_DAYS;
    const startMs = parisMidnight(toParisDate(Date.now() - lookbackDays * DAY_MS)) - DAY_MS;
    const endMs   = parisMidnight(toParisDate(Date.now() + DAY_MS));

    let freshSteps;
    let debugInfo = null;
    let sourceErrors = [];
    try {
      const { responses, sourceErrors: srcErr } = await fetchFromGoogleFit(fitness, startMs, endMs);
      sourceErrors = srcErr;
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
      console.error("Steps fetch error:", error?.message, error?.sourceErrors || "");
      const payload = {
        connected: true,
        needsReauth: false,
        steps: cachedSteps,
        stale: true,
      };
      if (debug === "1") payload.sourceErrors = error?.sourceErrors || [{ message: String(error?.message || "unknown") }];
      return res.status(200).json(payload);
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
    if (debug === "1") {
      payload.fetchMode = useRecentOnly ? `recent-${FRESH_WINDOW_DAYS}d` : `full-${HISTORY_DAYS}d`;
      if (sourceErrors.length) payload.sourceErrors = sourceErrors;
    }
    return res.status(200).json(payload);
  } catch (e) {
    console.error("Steps error:", e);
    return res.status(500).json({ error: "Failed to fetch steps" });
  }
}
