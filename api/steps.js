import admin from "./lib/firebaseAdmin.js";
import { google } from "googleapis";

const DAY_MS = 86400000;

const toParisDate = (ms) =>
  new Date(ms).toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });

function parseBuckets(response) {
  const dayMap = new Map();
  for (const bucket of response.data.bucket || []) {
    const steps = (bucket.dataset || [])
      .flatMap(ds => ds.point || [])
      .reduce((sum, p) => sum + (p.value?.[0]?.intVal || 0), 0);
    if (steps > 0) {
      const date = toParisDate(Number(bucket.startTimeMillis));
      dayMap.set(date, (dayMap.get(date) || 0) + steps);
    }
  }
  return [...dayMap.entries()].map(([date, steps]) => ({ date, steps }));
}

async function fetchRange(fitness, startMs, endMs) {
  const r = await fitness.users.dataset.aggregate({
    userId: "me",
    requestBody: {
      aggregateBy: [{ dataTypeName: "com.google.step_count.delta" }],
      bucketByTime: { durationMillis: DAY_MS },
      startTimeMillis: startMs,
      endTimeMillis: endMs,
    },
  });
  return parseBuckets(r);
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

    const now = Date.now();
    const oldestCached = cachedSteps.length > 0 ? cachedSteps[0].date : null;
    const cacheAgeMs = oldestCached
      ? now - new Date(oldestCached + "T00:00:00Z").getTime()
      : Infinity;

    // Cache < 300 jours → fetch 4×90j en parallèle. Sinon → 30j (delta)
    const CHUNK = 90 * DAY_MS;
    const chunks = cacheAgeMs < 300 * DAY_MS
      ? [0, 1, 2, 3].map(i => ({ startMs: now - (i + 1) * CHUNK, endMs: now - i * CHUNK }))
      : [{ startMs: now - 30 * DAY_MS, endMs: now + DAY_MS }];

    const fetchStartDate = toParisDate(Math.min(...chunks.map(c => c.startMs)));

    let freshSteps;
    try {
      const results = await Promise.all(chunks.map(c => fetchRange(fitness, c.startMs, c.endMs)));
      const dayMap = new Map();
      results.flat().forEach(d => dayMap.set(d.date, (dayMap.get(d.date) || 0) + d.steps));
      freshSteps = [...dayMap.entries()].map(([date, steps]) => ({ date, steps }));
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

    // Merge : données fraîches écrasent toujours le cache pour la période fetchée
    // Les jours plus anciens (hors fenêtre) sont conservés depuis le cache
    const merged = new Map();
    cachedSteps.forEach(d => { if (d.date < fetchStartDate) merged.set(d.date, d.steps); });
    freshSteps.forEach(d => merged.set(d.date, d.steps));

    const allSteps = [...merged.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, steps]) => ({ date, steps }));

    const cachedMap = new Map(cachedSteps.map(d => [d.date, d.steps]));
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
