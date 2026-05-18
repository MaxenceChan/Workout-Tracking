import admin from "../lib/firebaseAdmin.js";

export default async function handler(req, res) {
  try {
    const { code, state, error } = req.query;

    if (error) return res.status(400).send("Strava auth denied by user");
    if (!code || !state) return res.status(400).send("Missing code or state");

    const uid = state;

    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokens.refresh_token) {
      return res.status(400).send("No refresh token returned from Strava");
    }

    await admin.firestore().collection("users").doc(uid).set(
      {
        strava: {
          refresh_token: tokens.refresh_token,
          access_token: tokens.access_token,
          expires_at: tokens.expires_at,
          athlete_id: tokens.athlete?.id || null,
          connected_at: admin.firestore.FieldValue.serverTimestamp(),
          needs_reauth: false,
        },
      },
      { merge: true }
    );

    res.redirect("/?strava=connected");
  } catch (e) {
    console.error("Strava callback error:", e);
    res.status(500).send("Strava auth failed");
  }
}
