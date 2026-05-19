import admin from "./lib/firebaseAdmin.js";
import { google } from "googleapis";

const DAY_MS = 86400000;
const CACHE_DAYS = 7;

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
    for (const dataset of bucket.dataset || []) {
      for (const point of dataset.point || []) {
        const ms = Number(point.startTimeNanos) / 1e6 || Number(bucket.startTimeMillis);
        const date = toParisDate(ms);
        dayMap.set(date, (dayMap.get(date) || 0) + (point.value?.[0]?.intVal || 0));
      }
    }
  }
  return [...dayMap.entries()].filter(([, s]) => s > 0).map(([date, steps]) => ({ date, steps }));
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
    const cachedSteps = Array.isArray(userData.stepsCache?.steps) ? userData.stepsCache.steps : [];

    if (!refresh_token) {
      return res.status(200).json({ connected: false, needsReauth: false, steps: cachedSteps });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token });
    const fitness = google.fitness({ version: "v1", auth: oauth2Client });

    const windowStart = toParisDate(Date.now() - CACHE_DAYS * DAY_MS);
    const startMs = parisMidnight(windowStart) - DAY_MS;
    const endMs = parisMidnight(toParisDate(Date.now() + DAY_MS));

    let freshSteps;
    try {
      const response = await fetchFromGoogleFit(fitness, startMs, endMs);
      freshSteps = parseBuckets(response);
    } catch (error) {
      const msg = String(error?.message || "").toLowerCase();
      const apiErr = error?.response?.data?.error;
      const status = error?.response?.status || error?.code;
      if (apiErr === "invalid_grant" || msg.includes("invalid_grant") || status === 401) {
        await userRef.set({ googleFit: { needs_reauth: true } }, { merge: true });
        return res.status(200).json({ needsReauth: true, steps: cachedSteps });
      }
      throw error;
    }

    const recentDates = new Set(freshSteps.map(d => d.date));
    const merged = new Map();
    cachedSteps.forEach(d => { if (!recentDates.has(d.date)) merged.set(d.date, d.steps); });
    freshSteps.forEach(d => merged.set(d.date, d.steps));

    const allSteps = [...merged.entries()]
      .filter(([, s]) => s > 0)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, steps]) => ({ date, steps }));

    await userRef.set(
      { stepsCache: { steps: allSteps, updatedAt: admin.firestore.FieldValue.serverTimestamp() } },
      { merge: true }
    );

    return res.status(200).json({ connected: true, needsReauth: false, steps: allSteps });
  } catch (e) {
    console.error("Steps error:", e);
    return res.status(500).json({ error: "Failed to fetch steps" });
  }
}