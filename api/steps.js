import admin from "./lib/firebaseAdmin.js";
import { google } from "googleapis";

const DAY_MS = 86400000;

// Returns UTC timestamp of Paris midnight N days ago.
// Aligns chunk boundaries to Paris days → each Google Fit 24h bucket = one Paris calendar day.
function getParisMidnight(daysBack) {
  const d = new Date(Date.now() - daysBack * DAY_MS);
  const s = d.toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
  const base = new Date(s + "T00:00:00Z").getTime();
  for (const offset of [2, 1]) {
    const candidate = base - offset * 3600000;
    if (new Date(candidate).toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" }) === s)
      return candidate;
  }
  return base;
}

const toParisDate = (ms) =>
  new Date(ms).toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });

function parseBuckets(response) {
  const dayMap = new Map();
  for (const bucket of response.data.bucket || []) {
    const steps = (bucket.dataset || [])
      .flatMap((ds) => ds.point || [])
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
    if (!uid) return res.status(400).json({ error: "Missing uid" });

    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return res.status(404).json({ error: "User not found" });

    const userData = userSnap.data();
    const { refresh_token } = userData.googleFit || {};

    const cached = userData.stepsCache || {};
    const storedSteps = Object.entries(cached)
      .map(([date, steps]) => ({ date, steps }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    if (!refresh_token) {
      await userRef.set(
        { "googleFit.needs_reauth": true, "googleFit.updated_at": admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
      return res.status(200).json({ connected: false, needsReauth: true, steps: storedSteps });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token });
    const fitness = google.fitness({ version: "v1", auth: oauth2Client });

    const now = Date.now();
    const cacheUpdatedAt = userData.stepsCacheUpdatedAt?.toMillis?.() || 0;
    const cacheAgeMs = now - cacheUpdatedAt;

    const chunks =
      cacheAgeMs > 300 * DAY_MS
        ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => ({
            startMs: getParisMidnight((i + 1) * 30),
            endMs: i === 0 ? now : getParisMidnight(i * 30),
          }))
        : [{ startMs: getParisMidnight(30), endMs: now }];

    let freshSteps;
    try {
      const results = await Promise.all(chunks.map((c) => fetchRange(fitness, c.startMs, c.endMs)));
      const merged = new Map();
      results.flat().forEach(({ date, steps }) => {
        merged.set(date, Math.max(steps, merged.get(date) || 0));
      });
      freshSteps = [...merged.entries()].map(([date, steps]) => ({ date, steps }));
    } catch (error) {
      const msg = String(error?.message || "").toLowerCase();
      const apiError = error?.response?.data?.error;
      const status = error?.response?.status || error?.code;
      const invalidGrant = apiError === "invalid_grant" || msg.includes("invalid_grant") || status === 401;
      if (invalidGrant) {
        await userRef.set(
          { "googleFit.needs_reauth": true, "googleFit.last_error": { code: apiError || status || "invalid_grant", message: error?.message || "" }, "googleFit.updated_at": admin.firestore.FieldValue.serverTimestamp() },
          { merge: true }
        );
        return res.status(200).json({ connected: false, needsReauth: true, steps: storedSteps });
      }
      throw error;
    }

    const mergedMap = new Map(storedSteps.map((d) => [d.date, d.steps]));
    freshSteps.forEach(({ date, steps }) => {
      mergedMap.set(date, Math.max(steps, mergedMap.get(date) || 0));
    });
    const allSteps = [...mergedMap.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, steps]) => ({ date, steps }));

    const hasChanges = freshSteps.some(({ date, steps }) => (cached[date] || 0) < steps);
    if (hasChanges) {
      const newCache = Object.fromEntries(allSteps.map(({ date, steps }) => [date, steps]));
      await userRef.set(
        { stepsCache: newCache, stepsCacheUpdatedAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
    }

    return res.status(200).json({ connected: true, needsReauth: false, steps: allSteps });
  } catch (e) {
    console.error("Steps error:", e);
    return res.status(500).json({ error: "Failed to fetch steps" });
  }
}
