// /api/auth/google-fit.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
  } = process.env;

  // 🟢 CAS 1 — Google renvoie avec un code
  if (req.query.code) {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: req.query.code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokenRes.ok) {
      return res.status(500).json(tokens);
    }

    // 🔐 Pour l’instant : stock temporaire en cookie
    res.setHeader(
      "Set-Cookie",
      `google_fit_token=${tokens.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax`
    );

    // 👉 Retour vers ton app
    return res.redirect("/");
  }

  // 🟢 CAS 2 — Démarrage OAuth
  const scope = encodeURIComponent(
    "https://www.googleapis.com/auth/fitness.activity.read"
  );

  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth" +
    `?client_id=${GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${scope}` +
    `&access_type=offline` +
    `&prompt=consent`;

  res.redirect(authUrl);
}
