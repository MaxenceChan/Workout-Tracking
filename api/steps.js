import admin from "./lib/firebaseAdmin.js";
import { google } from "googleapis";

const DAYS = 90;
const MS_DAY = 24 * 60 * 60 * 1000;
const MIN_START = new Date("2025-01-01").getTime(); // 🔒 borne basse

export default async function handler(req, res) {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ error: "Missing uid" });

    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);

    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const googleFit = userSnap.data().googleFit;
    if (!googleFit?.refresh_token) {
      return res.status(401).json({ error: "Google Fit not connected" });
    }

    // 🔐 OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: googleFit.access_token,
      refresh_token: googleFit.refresh_token,
    });

    const fitness = google.fitness({ version: "v1", auth: oauth2Client });

    // 🧠 Lire meta
    const metaRef = userRef.collection("meta").doc("steps");
    const metaSnap = await metaRef.get();

    let end = Date.now();
    let start;

    if (!metaSnap.exists) {
      // 🟢 Premier import → 90 derniers jours
      start = Math.max(end - DAYS * MS_DAY, MIN_START);
    } else {
      const { oldestFetched, finished } = metaSnap.data();
      if (finished) {
        return res.status(200).json({ message: "Steps fully imported" });
      }

      const oldestTime = new Date(oldestFetched).getTime();
      start = Math.max(oldestTime - DAYS * MS_DAY, MIN_START);
      end = oldestTime;
    }

    // 🛑 Stop condition
    if (end <= MIN_START) {
      await metaRef.set({ finished: true }, { merge: true });
      return res.status(200).json({ message: "Backfill completed" });
    }

    // 📊 Google Fit aggregate
    const response = await fitness.users.dataset.aggregate({
      userId: "me",
      requestBody: {
        aggregateBy: [{ dataTypeName: "com.google.step_count.delta" }],
        bucketByTime: { durationMillis: MS_DAY },
        startTimeMillis: start,
        endTimeMillis: end,
      },
    });

    const dailySteps = response.data.bucket.map((b) => {
      const date = new Date(Number(b.startTimeMillis))
        .toISOString()
        .slice(0, 10);

      const steps =
        b.dataset?.[0]?.point?.reduce(
          (sum, p) => sum + (p.value?.[0]?.intVal || 0),
          0
        ) || 0;

      return { date, steps };
    });

    // 💾 Batch Firestore
    const batch = db.batch();
    dailySteps.forEach((d) => {
      const ref = userRef.collection("steps").doc(d.date);
      batch.set(ref, {
        ...d,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    // 🧠 Update meta
    const oldestDateInBatch = dailySteps
      .map((d) => d.date)
      .sort()[0];

    batch.set(metaRef, {
      oldestFetched: oldestDateInBatch,
      finished: false,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await batch.commit();

    return res.status(200).json({
      imported: dailySteps.length,
      range: {
        start: new Date(start).toISOString().slice(0, 10),
        end: new Date(end).toISOString().slice(0, 10),
      },
    });

  } catch (e) {
    console.error("Steps error:", e);
    return res.status(500).json({ error: "Failed to fetch steps" });
  }
}
