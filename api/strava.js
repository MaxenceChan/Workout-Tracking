import admin from "./lib/firebaseAdmin.js";

async function getValidToken(stravaData, userRef) {
  const { refresh_token, access_token, expires_at } = stravaData;

  if (!refresh_token) return null;

  const now = Math.floor(Date.now() / 1000);
  if (access_token && expires_at && expires_at > now + 60) {
    return access_token;
  }

  // Refresh the token
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const refreshed = await res.json();

  if (refreshed.errors || !refreshed.access_token) {
    await userRef.set({ "strava.needs_reauth": true }, { merge: true });
    return null;
  }

  await userRef.set(
    {
      strava: {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || refresh_token,
        expires_at: refreshed.expires_at,
        needs_reauth: false,
      },
    },
    { merge: true }
  );

  return refreshed.access_token;
}

export default async function handler(req, res) {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ error: "Missing uid" });

    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) return res.status(404).json({ error: "User not found" });

    const stravaData = userSnap.data().strava || {};

    if (!stravaData.refresh_token) {
      return res.status(200).json({ needsReauth: true, activities: [] });
    }

    const token = await getValidToken(stravaData, userRef);
    if (!token) {
      return res.status(200).json({ needsReauth: true, activities: [] });
    }

    // Fetch last 90 days of activities
    const after = Math.floor((Date.now() - 90 * 24 * 3600 * 1000) / 1000);
    const activitiesRes = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=200`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const raw = await activitiesRes.json();

    if (!Array.isArray(raw)) {
      await userRef.set({ "strava.needs_reauth": true }, { merge: true });
      return res.status(200).json({ needsReauth: true, activities: [] });
    }

    const activities = raw
      .filter((a) => a.type === "Run")
      .map((a) => ({
        id: a.id,
        name: a.name,
        date: new Date(a.start_date).toLocaleDateString("fr-CA", {
          timeZone: "Europe/Paris",
        }),
        distance: a.distance,        // metres
        moving_time: a.moving_time,  // secondes
        elevation: Math.round(a.total_elevation_gain || 0),
        avg_speed: a.average_speed,  // m/s
        avg_hr: a.average_heartrate || null,
        max_hr: a.max_heartrate || null,
      }));

    return res.status(200).json({ needsReauth: false, activities });
  } catch (e) {
    console.error("Strava error:", e);
    return res.status(500).json({ error: "Failed to fetch Strava data" });
  }
}
