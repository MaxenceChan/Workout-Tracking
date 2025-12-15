export const config = {
  runtime: "nodejs",
};

const { google } = require("googleapis");
const admin = require("../lib/firebaseAdmin").default;

export default async function handler(req, res) {
  try {
    const { code, state } = req.query;
    const uid = state;

    if (!code || !uid) {
      return res.status(400).send("Invalid callback");
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const fitness = google.fitness({
      version: "v1",
      auth: oauth2Client,
    });

    const endTime = Date.now();
    const startTime = endTime - 30 * 24 * 60 * 60 * 1000;

    const response = await fitness.users.dataset.aggregate({
      userId: "me",
      requestBody: {
        aggregateBy: [
          { dataTypeName: "com.google.step_count.delta" },
        ],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startTime,
        endTimeMillis: endTime,
      },
    });

    const steps = response.data.bucket.map((b) => ({
      date: new Date(Number(b.startTimeMillis))
        .toISOString()
        .slice(0, 10),
      steps:
        b.dataset[0]?.point?.reduce(
          (sum, p) => sum + p.value[0].intVal,
          0
        ) || 0,
    }));

    const db = admin.firestore();
    const batch = db.batch();

    steps.forEach((d) => {
      const ref = db
        .collection("steps")
        .doc(`${uid}_${d.date}`);

      batch.set(ref, {
        user_id: uid,
        date: d.date,
        steps: d.steps,
        source: "google_fit",
        updated_at: new Date().toISOString(),
      });
    });

    await batch.commit();

    return res.redirect("/");
  } catch (err) {
    console.error("google-fit-callback error:", err);
    return res.status(500).send("Google Fit sync failed");
  }
}
