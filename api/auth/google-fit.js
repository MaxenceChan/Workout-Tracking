import { google } from "googleapis";

export default async function handler(req, res) {
  try {
    const { uid } = req.query;

    // 🔴 Sécurité minimale
    if (!uid) {
      return res.status(400).send("Missing uid");
    }

    // 🔐 Client OAuth Google
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // 🎯 Scopes Google Fit (lecture des pas)
    const scopes = [
      "https://www.googleapis.com/auth/fitness.activity.read",
    ];

    // 🔥 URL OAuth AVEC FORÇAGE DU CONSENTEMENT
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",     // 🔥 indispensable pour refresh_token
      prompt: "consent",          // 🔥 force Google à redonner le refresh_token
      scope: scopes,
      state: uid,                 // 🔑 on passe l’uid au callback
      include_granted_scopes: false,
    });

    // 🔁 Redirection vers Google
    return res.redirect(authUrl);
  } catch (error) {
    console.error("GOOGLE FIT AUTH ERROR", error);
    return res.status(500).send("Google Fit auth failed");
  }
}
