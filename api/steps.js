import admin from "./lib/firebaseAdmin.js";
import { google } from "googleapis";

export default async function handler(req, res) {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ error: "Missing uid" });

    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) return res.status(404).json({ error: "User not found" });

    const { refresh_token } = userSnap.data().googleFit || {};

    // Toujours charger l'historique Firestore (toutes les données déjà stockées)
    const loadStoredSteps = async () => {
      const snap = await userRef.collection("steps").orderBy("date", "asc").get();
      return snap.docs.map(doc => ({ date: doc.data().date, steps: doc.data().steps || 0 }));
    };

    if (!refresh_token) {
      const storedSteps = await loadStoredSteps();
      await userRef.set({ "googleFit.needs_reauth": true, "googleFit.updated_at": admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return res.status(200).json({ needsReauth: true, steps: storedSteps });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token });
    const fitness = google.fitness({ version: "v1", auth: oauth2Client });

    // Chercher la date du dernier jour stocké pour ne fetcher que le delta
    const storedSteps = await loadStoredSteps();
    const lastStoredDate = storedSteps.length > 0 ? storedSteps[storedSteps.length - 1].date : null;

    // Fetcher depuis le lendemain du dernier stocké, ou 60 jours si rien en cache
    const end = Date.now();
    const startDate = lastStoredDate
      ? new Date(lastStoredDate + "T00:00:00Z").getTime() // commence au dernier jour stocké (pour le mettre à jour)
      : end - 60 * 24 * 60 * 60 * 1000;
    const start = Math.min(startDate, end - 60 * 24 * 60 * 60 * 1000); // au moins 60 jours

    let response;
    try {
      response = await fitness.users.dataset.aggregate({
        userId: "me",
        requestBody: {
          aggregateBy: [{ dataTypeName: "com.google.step_count.delta" }],
          bucketByTime: { durationMillis: 24 * 60 * 60 * 1000 },
          startTimeMillis: start,
          endTimeMillis: end,
        },
      });
    } catch (error) {
      const errorMessage = String(error?.message || "").toLowerCase();
      const apiError = error?.response?.data?.error;
      const status = error?.response?.status || error?.code;
      const invalidGrant = apiError === "invalid_grant" || errorMessage.includes("invalid_grant") || status === 401;

      if (invalidGrant) {
        await userRef.set({ "googleFit.needs_reauth": true, "googleFit.last_error": { code: apiError || status || "invalid_grant", message: error?.message || "invalid_grant" }, "googleFit.updated_at": admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        return res.status(200).json({ needsReauth: true, steps: storedSteps });
      }
      throw error;
    }

    const freshSteps = (response.data.bucket || []).map((b) => ({
      date: new Date(Number(b.startTimeMillis)).toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" }),
      steps: b.dataset?.[0]?.point?.reduce((sum, p) => sum + (p.value?.[0]?.intVal || 0), 0) || 0,
    })).filter(d => d.steps > 0);

    // Sauvegarder les nouvelles données dans Firestore
    if (freshSteps.length > 0) {
      const batch = db.batch();
      freshSteps.forEach(d => {
        batch.set(userRef.collection("steps").doc(d.date), { ...d, updated_at: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      });
      await batch.commit();
    }

    // Fusionner cache Firestore + données fraîches (les fraîches écrasent les anciennes)
    const merged = new Map();
    storedSteps.forEach(d => merged.set(d.date, d.steps));
    freshSteps.forEach(d => merged.set(d.date, d.steps));
    const allSteps = [...merged.entries()]
      .sort(([a], [b]) => a < b ? -1 : 1)
      .map(([date, steps]) => ({ date, steps }));

    return res.status(200).json({ needsReauth: false, steps: allSteps });
  } catch (e) {
    console.error("Steps error:", e);
    return res.status(500).json({ error: "Failed to fetch steps" });
  }
}
