// /api/auth/google-fit.js

export default async function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({
      error: "Google OAuth env variables missing",
    });
  }

  const scope = encodeURIComponent(
    "https://www.googleapis.com/auth/fitness.activity.read"
  );

  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth" +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${scope}` +
    `&access_type=offline` +
    `&prompt=consent`;

  // 🔁 Redirection vers Google
  res.redirect(authUrl);
}
