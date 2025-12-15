import { google } from "googleapis";
import admin from "../lib/firebaseAdmin.js";

export default async function handler(req, res) {
  try {
    const { code, state } = req.query;

    // 🔴 Sécurité de base
    if (!code || !state) {
      return res.status(400).send("Missing code or state");
    }

    const uid = state; // on a passé l’uid dans state à l’étape OAuth

    // 🔐 OAuth client Google
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // 🔁 Échange code → tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    if (!tokens.refresh_token) {
      console.warn(
        "⚠️ Aucun refresh_token reçu. L'utilisateur a probablement déjà autorisé l'app."
      );
    }

    // 💾 CRÉATION / MISE À JOUR DU USER DANS FIRESTORE
    await admin
      .firestore()
      .collection("users")
      .doc(uid)
      .set(
        {
          uid,
          googleFit: {
            access_token: tokens.access_token || null,
            refresh_token: tokens.refresh_token || null, // 🔥 CRUCIAL
            scope: tokens.scope || null,
            token_type: tokens.token_type || null,
            expiry_date: tokens.expiry_date || null,
          },
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    // 🔁 Redirection vers l’app front
    return res.redirect(
      `${process.env.FRONTEND_URL}/?googleFit=connected`
    );
  } catch (error) {
    console.error("GOOGLE FIT CALLBACK ERROR", error);
    return res.status(500).send("Google Fit callback failed");
  }
}
