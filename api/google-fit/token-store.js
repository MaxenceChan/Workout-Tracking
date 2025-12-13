import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "../firebase-admin";

initAdmin();
const db = getFirestore();

export async function setRefreshToken(uid, refreshToken) {
  if (!refreshToken) return;

  await db.collection("google_fit_tokens").doc(uid).set(
    {
      refresh_token: refreshToken,
      updated_at: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function getRefreshToken(uid) {
  const doc = await db.collection("google_fit_tokens").doc(uid).get();
  if (!doc.exists) return null;
  return doc.data().refresh_token;
}
