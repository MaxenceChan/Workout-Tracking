import { google } from "googleapis";
import admin from "../lib/firebaseAdmin";

export default async function handler(req, res) {
  try {
    const { code, state: uid } = req.query;
    if (!code || !uid) return res.status(400).send("Missing params");

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // 🔐 échange du code contre tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // 🚶 Google Fit API
    const fitness = google.fitness({ version: "v1", auth: oauth2Client });

    const now = Date.now();
    const start = now - 30 * 24 * 60 * 60 * 1000; // 30 jours

    const response = await fitness.users.dataset.aggregate({
      userId: "me",
      requestBody: {
        aggregateBy: [{ dataTypeName: "com.google.step_count.delta" }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: start,
        endTimeMillis: now,
      },
    });

    const buckets = response.data.bucket || [];

    const stepsByDay = buckets.map((b) => {
      const steps =
        b.dataset?.[0]?.point?.reduce(
          (sum, p) => sum + (p.value?.[0]?.intVal || 0),
          0
        ) || 0;

      return {
        date: new Date(Number(b.startTimeMillis)).toISOString().slice(0, 10),
        steps,
      };
    });

    // 💾 FIRESTORE
    const ref = admin
      .firestore()
      .collection("users")
      .doc(uid)
      .collection("steps");

    const batch = admin.firestore().batch();
    stepsByDay.forEach((d) => {
      const docRef = ref.doc(d.date);
      batch.set(docRef, d, { merge: true });
    });
    await batch.commit();

    // 🔁 retour app
    res.redirect("/");

  } catch (e) {
    console.error(e);
    res.status(500).send("Google Fit error");
  }
}
