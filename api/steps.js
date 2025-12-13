import { getRefreshToken } from "./google-fit/token-store";
import { refreshAccessToken } from "./google-fit/refresh";

async function callGoogleFit(accessToken) {
  const res = await fetch(
    "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        aggregateBy: [{ dataTypeName: "com.google.step_count.delta" }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: Date.now() - 7 * 86400000,
        endTimeMillis: Date.now(),
      }),
    }
  );

  if (!res.ok) {
    const err = new Error("Google Fit error");
    err.status = res.status;
    throw err;
  }

  return res.json();
}

export default async function handler(req, res) {
  const accessToken =
    req.headers.cookie?.match(/google_fit_token=([^;]+)/)?.[1];

  const uid = req.firebaseUid; // ← déjà dispo chez toi via Firebase Admin

  try {
    const data = await callGoogleFit(accessToken);
    return res.json(data);
  } catch (err) {
    if (err.status !== 401) throw err;

    // 🔄 refresh automatique
    const refreshToken = await getRefreshToken(uid);
    const fresh = await refreshAccessToken(refreshToken);

    res.setHeader(
      "Set-Cookie",
      `google_fit_token=${fresh.access_token}; Path=/; HttpOnly; SameSite=Lax`
    );

    const data = await callGoogleFit(fresh.access_token);
    return res.json(data);
  }
}
