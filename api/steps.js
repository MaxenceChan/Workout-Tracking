import admin from "./lib/firebaseAdmin.js";
import { google } from "googleapis";

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

    const { refresh_token } = userSnap.data().googleFit || {};

    const loadStoredSteps = async () => {
      const stepsSnap = await userRef
        .collection("steps")
        .orderBy("date", "asc")
        .get();

      return stepsSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          date: data.date,
          steps: data.steps || 0,
        };
      });
    };

    if (!refresh_token) {
      const storedSteps = await loadStoredSteps();
      return res.status(200).json(storedSteps);
    }

    // 🔐 OAuth client (refresh_token uniquement)
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({ refresh_token });

    const fitness = google.fitness({ version: "v1", auth: oauth2Client });

    const end = Date.now();
    const start = end - 90 * 24 * 60 * 60 * 1000; // 90 jours

    let response;
    try {
      response = await fitness.users.dataset.aggregate({
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
    } catch (error) {
      const errorMessage = String(error?.message || "").toLowerCase();
      const apiError = error?.response?.data?.error;
      const status = error?.response?.status || error?.code;
      const invalidGrant =
        apiError === "invalid_grant" ||
        errorMessage.includes("invalid_grant") ||
        status === 401;

      if (invalidGrant) {
        await userRef.set(
          {
            "googleFit.needs_reauth": true,
            "googleFit.last_error": {
              code: apiError || status || "invalid_grant",
              message: error?.message || "invalid_grant",
            },
            "googleFit.updated_at": admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        const storedSteps = await loadStoredSteps();
        return res.status(200).json(storedSteps);
      }

      throw error;
    }

    const dailySteps = (response.data.bucket || []).map((b) => {
    const date = new Date(Number(b.startTimeMillis))
      .toLocaleDateString("fr-CA", {
        timeZone: "Europe/Paris",
      });

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
      batch.set(
        ref,
        {
          ...d,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    await batch.commit();

    return res.status(200).json(dailySteps);
  } catch (e) {
    console.error("Steps error:", e);
    return res.status(500).json({ error: "Failed to fetch steps" });
  }
}
