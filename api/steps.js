import admin from "./lib/firebaseAdmin.js";
import { google } from "googleapis";

const DAY_MS = 86400000;
const HISTORY_DAYS = 730;

const toParisDate = (ms) =>
  new Date(ms).toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });

const parisMidnight = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00");
  const paris = new Date(d.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  return paris.getTime();
};

async function fetchFromGoogleFit(fitness, startMs, endMs) {
  try {
    return await fitness.users.dataset.aggregate({
      userId: "me",
      requestBody: {
        aggregateBy: [{ dataSourceId: "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps" }],
        bucketByTime: { durationMillis: DAY_MS },
        startTimeMillis: startMs,
        endTimeMillis: endMs,
      },
    });
  } catch (e) {
    if (!String(e?.message || "").includes("DataSourceId")) throw e;
  }
  return fitness.users.dataset.aggregate({
    userId: "me",
    requestBody: {
      aggregateBy: [{ dataTypeName: "com.google.step_count.delta" }],
      bucketByTime: { durationMillis: DAY_MS },
      startTimeMillis: startMs,
      endTimeMillis: endMs,
    },
  });
}

function parseBuckets(response) {
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
  return [...dayMap.entries()].map(([date, steps]) => ({ date, steps }));
}

function fillGaps(steps) {
  if (steps.length < 2) return steps;
  const map = new Map(steps.map(d => [d.date, d.steps]));
  const sorted = steps.map(d => d.date).sort();
  const first = new Date(sorted[0] + "T00:00:00Z");
  const last  = new Date(sorted[sorted.length - 1] + "T00:00:00Z");
  const filled = [];
  for (let d = new Date(first); d <= last; d.setUTCDate(d.getUTCDate() + 1)) {
    const date = d.toISOString().slice(0, 10);
    filled.push({ date, steps: map.get(date) ?? 0 });
  }
  return filled;
}

export default async function handler(req, res) {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(200).json({ ok: true });

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

    // Toujours fetcher les 730 derniers jours depuis Google Fit
    const startMs = parisMidnight(toParisDate(Date.now() - HISTORY_DAYS * DAY_MS)) - DAY_MS;
    const endMs   = parisMidnight(toParisDate(Date.now() + DAY_MS));

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
      throw error;
    }

    const allSteps = fillGaps(freshSteps);

    // Écriture Firestore sautée si aucune donnée nouvelle
    const cachedMap  = new Map(cachedSteps.map(d => [d.date, d.steps]));
    const hasChanges = freshSteps.some(f => cachedMap.get(f.date) !== f.steps);

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
