export default function handler(req, res) {
  const { uid } = req.query;
  if (!uid) return res.status(400).send("Missing uid");

  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: process.env.STRAVA_REDIRECT_URI,
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read_all",
    state: uid,
  });

  res.redirect(`https://www.strava.com/oauth/authorize?${params}`);
}
