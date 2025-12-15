import admin from "./lib/firebaseAdmin";

export default async function handler(req, res) {
  await admin.firestore().collection("TEST").add({
    ok: true,
    created_at: new Date().toISOString(),
  });

  res.send("Firestore OK");
}
