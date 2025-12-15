import { google } from "googleapis";

/**
 * Endpoint OAuth Google Fit
 * - Phase 1 : redirection vers Google (uid → state)
 * - Phase 2 : retour Google (code + state → uid)
 */
export default async function handler(req, res) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI // EXACTEMENT cette URL
    );

    /**
     * ───────────────────────────────────────────────
     * PHASE 2 — RETOUR DE GOOGLE
     * Google appelle :
     * /api/auth/google-fit?code=XXX&state=UID
     * ───────────────────────────────────────────────
     */
    if (req.query.code) {
      const { code, state } = req.query;
      const uid = state; // ✅ RESTAURATION DU UID

      if (!uid) {
        return res.status(400).send("Missing uid (state)");
      }

      // Échange code → tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // 🔐 TODO : stocker les tokens par uid (Firestore / DB)
      // await saveGoogleFitTokens(uid, tokens);

      // Redirection finale vers l'app
      return res.redirect("/");
    }

    /**
     * ───────────────────────────────────────────────
     * PHASE 1 — DÉPART VERS GOOGLE
     * Appelle :
     * /api/auth/google-fit?uid=UID
     * ───────────────────────────────────────────────
     */
    const { uid } = req.query;

    if (!uid) {
      return res.status(400).send("Missing uid");
    }

    const scopes = [
      "https://www.googleapis.com/auth/fitness.activity.read",
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: scopes,
      state: uid, // ✅ UID transporté proprement
    });

    return res.redirect(url);
  } catch (err) {
    console.error("Google Fit OAuth error:", err);
    return res.status(500).send("Google Fit OAuth error");
  }
}
