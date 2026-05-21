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
    const userRef = admin.firestore().collection("users").doc(uid);

    let refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      const existingUser = await userRef.get();
      refreshToken = existingUser.data()?.googleFit?.refresh_token;
    }

    if (!refreshToken) {
      return res.status(400).send("No refresh token returned");
    }

    await userRef.set(
      {
        googleFit: {
          refresh_token: refreshToken,
          connected_at: admin.firestore.FieldValue.serverTimestamp(),
          needs_reauth: false,
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
