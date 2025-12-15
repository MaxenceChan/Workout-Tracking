import admin from "./lib/firebaseAdmin.js";
import { google } from "googleapis";

export default async function handler(req, res) {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ error: "Missing uid" });

    // 🔑 récupérer tokens Google Fit stockés
    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const { access_token, refresh_token } = userSnap.data().googleFit;
    if (!access_token) {
      return res.status(401).json({ error: "Google Fit not connected" });
    }

    // 🔐 OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token,
      refresh_token,
    });

    // 📊 Google Fit aggregate API
    const fitness = google.fitness({ version: "v1", auth: oauth2Client });

    const end = Date.now();
    const start = end - 90 * 24 * 60 * 60 * 1000; // ⬅️ 90 jours

    const response = await fitness.users.dataset.aggregate({
      userId: "me",
      requestBody: {
        aggregateBy: [
          { dataTypeName: "com.google.step_count.delta" },
        ],
        bucketByTime: { durationMillis: 24 * 60 * 60 * 1000 },
        startTimeMillis: start,
        endTimeMillis: end,
      },
    });

    // 🧮 transformation par jour
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

    // 💾 sauvegarde Firestore
    const batch = db.batch();

    dailySteps.forEach((d) => {
      const ref = userRef.collection("steps").doc(d.date);
      batch.set(ref, {
        ...d,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    return res.status(200).json(dailySteps);
  } catch (e) {
    console.error("Steps error:", e);
    return res.status(500).json({ error: "Failed to fetch steps" });
  }
}
