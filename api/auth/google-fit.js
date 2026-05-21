import { google } from "googleapis";

export default function handler(req, res) {
  const { uid } = req.query;

  if (!uid) {
    return res.status(400).send("Missing uid");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const scopes = [
    "https://www.googleapis.com/auth/fitness.activity.read",
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // IMPORTANT pour refresh_token
    scope: scopes,
    state: uid, // 🔥 LE UID EST ICI
  });

  res.redirect(url);
}
