import { google } from "googleapis";
import admin from "../lib/firebaseAdmin.js";

export default async function handler(req, res) {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).send("Missing code or state");
    }

    const uid = state; // ✅ récupéré depuis OAuth

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return res.status(400).send("No refresh token returned");
    }

    await admin.firestore().collection("users").doc(uid).set(
      {
        googleFit: {
          refresh_token: tokens.refresh_token,
          connected_at: admin.firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );

    // 🔁 Retour app
    res.redirect("/?googleFit=connected");
  } catch (e) {
    console.error("Google Fit callback error:", e);
    res.status(500).send("Google Fit auth failed");
  }
}
