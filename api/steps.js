import admin from "./lib/firebaseAdmin.js";
import { google } from "googleapis";

// ───────────────────────────────────────────────
// Constantes
// ───────────────────────────────────────────────
const DAYS = 90;
const MS_DAY = 24 * 60 * 60 * 1000;

// ───────────────────────────────────────────────
// Handler principal
// ───────────────────────────────────────────────
export default async function handler(req, res) {
  const db = admin.firestore();

  // 🕒 Détection CRON Vercel
  const isCron = req.headers["x-vercel-cron"] === "1";

  try {
    // ─────────────────────────────────────────────
    // 🟢 MODE CRON → tous les utilisateurs connectés
    // ─────────────────────────────────────────────
    if (isCron) {
      const usersSnap = await db
        .collection("users")
        .where("googleFit.refresh_token", "!=", null)
        .get();

      let success = 0;
      let failed = 0;

      for (const doc of usersSnap.docs) {
        try {
          await syncStepsForUser(doc.id, db);
          success++;
        } catch (e) {
          console.error(`Cron error for user ${doc.id}`, e);
          failed++;
        }
      }

      return res.status(200).json({
        message: "Google Fit daily sync finished",
        usersProcessed: usersSnap.size,
        success,
        failed,
      });
    }

    // ─────────────────────────────────────────────
    // 🟢 MODE MANUEL → un seul utilisateur
    // ─────────────────────────────────────────────
    const { uid } = req.query;
    if (!uid) {
      return res.status(400).json({ error: "Missing uid" });
    }

    const result = await syncStepsForUser(uid, db);
    return res.status(200).json(result);

  } catch (e) {
    console.error("Steps global error:", e);
    return res.status(500).json({ error: "Failed to sync steps" });
  }
}

// ───────────────────────────────────────────────
// Fonction : sync des pas pour 1 utilisateur
// ───────────────────────────────────────────────
async function syncStepsForUser(uid, db) {
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    throw new Error("User not found");
  }

  const googleFit = userSnap.data().googleFit;
  if (!googleFit?.refresh_token) {
    throw new Error("Google Fit not connected");
  }

  // 🔐 OAuth Google
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: googleFit.access_token,
    refresh_token: googleFit.refresh_token,
  });

  const fitness = google.fitness({
    version: "v1",
    auth: oauth2Client,
  });

  // ─────────────────────────────────────────────
  // 📅 Fenêtre fixe : 90 derniers jours
  // ─────────────────────────────────────────────
  const end = Date.now();
  const start = end - DAYS * MS_DAY;

  // ─────────────────────────────────────────────
  // 📊 Appel Google Fit
  // ─────────────────────────────────────────────
  const response = await fitness.users.dataset.aggregate({
    userId: "me",
    requestBody: {
      aggregateBy: [
        { dataTypeName: "com.google.step_count.delta" },
      ],
      bucketByTime: {
        durationMillis: MS_DAY,
      },
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

  // ─────────────────────────────────────────────
  // 💾 Sauvegarde Firestore (idempotente)
  // ─────────────────────────────────────────────
  const batch = db.batch();

  dailySteps.forEach(({ date, steps }) => {
    const ref = userRef.collection("steps").doc(date);
    batch.set(ref, {
      date,
      steps,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();

  return {
    importedDays: dailySteps.length,
    range: {
      start: new Date(start).toISOString().slice(0, 10),
      end: new Date(end).toISOString().slice(0, 10),
    },
  };
}
