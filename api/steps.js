import admin from "./lib/firebaseAdmin.js";
import { google } from "googleapis";

// ───────────────────────────────────────────────
// Constantes
// ───────────────────────────────────────────────
const DAYS = 90;
const MS_DAY = 24 * 60 * 60 * 1000;
const MIN_START = new Date("2025-01-01").getTime(); // borne basse historique

// ───────────────────────────────────────────────
// Handler principal
// ───────────────────────────────────────────────
export default async function handler(req, res) {
  const db = admin.firestore();

  // 🕒 Détection CRON Vercel
  const isCron = req.headers["x-vercel-cron"] === "1";

  try {
    // ─────────────────────────────────────────────
    // 🟢 MODE CRON → traiter TOUS les users connectés
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
          await syncStepsForUser(doc.id);
          success++;
        } catch (e) {
          console.error(`Cron error for user ${doc.id}`, e);
          failed++;
        }
      }

      return res.status(200).json({
        message: "Daily Google Fit sync finished",
        usersProcessed: usersSnap.size,
        success,
        failed,
      });
    }

    // ─────────────────────────────────────────────
    // 🟢 MODE NORMAL → un seul utilisateur
    // ─────────────────────────────────────────────
    const { uid } = req.query;
    if (!uid) {
      return res.status(400).json({ error: "Missing uid" });
    }

    const result = await syncStepsForUser(uid);
    return res.status(200).json(result);

  } catch (e) {
    console.error("Steps global error:", e);
    return res.status(500).json({ error: "Failed to sync steps" });
  }

  // ───────────────────────────────────────────────
  // Fonction interne : sync pour 1 user
  // ───────────────────────────────────────────────
  async function syncStepsForUser(uid) {
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
    // 🧠 Gestion pagination temporelle (90 jours)
    // ─────────────────────────────────────────────
    const metaRef = userRef.collection("meta").doc("steps");
    const metaSnap = await metaRef.get();

    let end = Date.now();
    let start;

    if (!metaSnap.exists) {
      // Premier import → derniers 90 jours
      start = Math.max(end - DAYS * MS_DAY, MIN_START);
    } else {
      const { oldestFetched, finished } = metaSnap.data();
      if (finished) {
        return { message: "Steps already fully imported" };
      }

      end = new Date(oldestFetched).getTime();
      start = Math.max(end - DAYS * MS_DAY, MIN_START);
    }

    // 🛑 Condition d’arrêt
    if (end <= MIN_START) {
      await metaRef.set(
        {
          finished: true,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return { message: "Backfill completed" };
    }

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
    // 💾 Sauvegarde Firestore
    // ─────────────────────────────────────────────
    const batch = db.batch();

    dailySteps.forEach((d) => {
      const ref = userRef.collection("steps").doc(d.date);
      batch.set(ref, {
        ...d,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    // Mise à jour meta
    if (dailySteps.length > 0) {
      const oldestDate = dailySteps
        .map((d) => d.date)
        .sort()[0];

      batch.set(
        metaRef,
        {
          oldestFetched: oldestDate,
          finished: false,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    await batch.commit();

    return {
      importedDays: dailySteps.length,
      range: {
        start: new Date(start).toISOString().slice(0, 10),
        end: new Date(end).toISOString().slice(0, 10),
      },
    };
  }
}
