import admin from "./lib/firebaseAdmin.js";

const PARIS_TIMEZONE = "Europe/Paris";

const formatDate = (date) =>
  date.toLocaleDateString("fr-CA", { timeZone: PARIS_TIMEZONE });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization || "";
  const tokenMatch = authHeader.match(/^Bearer (.+)$/);
  if (!tokenMatch) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(tokenMatch[1]);
    const uid = decoded.uid;
    const email = decoded.email || null;

    const date = formatDate(new Date());
    const db = admin.firestore();
    const ref = db.collection("logins").doc(`${uid}_${date}`);
    const payload = {
      user_id: uid,
      user_email: email,
      date,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    const snap = await ref.get();
    if (!snap.exists) {
      payload.created_at = admin.firestore.FieldValue.serverTimestamp();
    }

    await ref.set(payload, { merge: true });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Track login error:", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
}
