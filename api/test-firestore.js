import admin from "./lib/firebaseAdmin.js";

export default async function handler(req, res) {
  try {
    await admin.firestore().collection("TEST").add({
      ok: true,
      created_at: new Date().toISOString(),
    });

    res.send("Firestore OK");
  } catch (e) {
    console.error("🔥 FIRESTORE ERROR:", e);
    res.status(500).json({
      message: "Firestore crash",
      error: e.message,
    });
  }
}
