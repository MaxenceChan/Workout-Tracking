import admin from "./lib/firebaseAdmin.js";
import { google } from "googleapis";

const DAY_MS = 86400000;
const HISTORY_DAYS = 730;

// Rate limit in-memory : 30 req/min/uid → confortable pour polling 5min + multi-tab
// + refresh manuels, mais bloque le spam (>30 req/min/user = abus évident)
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

const LIVE_STEP_SOURCE =
  "derived:com.google.step_count.delta:com.google.android.gms:merge_step_deltas";

// Buckets jour alignés Europe/Paris : Google Fit gère DST automatiquement
async function fetchFromGoogleFit(fitness, startMs, endMs) {
  const baseReq = {
    bucketByTime: { period: { type: "day", value: 1, timeZoneId: "Europe/Paris" } },
    startTimeMillis: startMs,
    endTimeMillis: endMs,
  };
  try {
    return await fitness.users.dataset.aggregate({
      userId: "me",
      requestBody: { aggregateBy: [{ dataSourceId: LIVE_STEP_SOURCE }], ...baseReq },
    });
  } catch (e) {
    const msg = String(e?.message || "");
    if (!msg.includes("DataSourceId") && !msg.includes("dataSource")) throw e;
  }
  return fitness.users.dataset.aggregate({
    userId: "me",
    requestBody: { aggregateBy: [{ dataTypeName: "com.google.step_count.delta" }], ...baseReq },
  });
}

function parseBuckets(response) {
  const dayMap = new Map();
  for (const bucket of response.data.bucket || []) {
    // bucket.startTimeMillis = minuit Paris UTC (timeZoneId fourni à l'API)
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
  return [...dayMap.entries()].map(([date, steps]) => ({ date, steps }));
}

function fillGaps(steps) {
  if (steps.length < 2) return steps;
  const map = new Map(steps.map(d => [d.date, d.steps]));
  const sorted = steps.map(d => d.date).sort();
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

// max(fresh, cached) par jour : un 0 transitoire ne wipe jamais l'historique
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
    const { uid } = req.query;
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

    // Fenêtre large : Google Fit aligne sur minuit Paris en interne
    const now = Date.now();
    const startMs = now - HISTORY_DAYS * DAY_MS;
    const endMs   = now + DAY_MS;

    let freshSteps;
    try {
      const response = await fetchFromGoogleFit(fitness, startMs, endMs);
      freshSteps = parseBuckets(response);
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

    return res.status(200).json({ connected: true, needsReauth: false, steps: allSteps });
  } catch (e) {
    console.error("Steps error:", e);
    return res.status(500).json({ error: "Failed to fetch steps" });
  }
}
