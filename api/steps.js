// /api/steps.js

export default async function handler(req, res) {
  const cookie = req.headers.cookie || "";
  const tokenMatch = cookie.match(/google_fit_token=([^;]+)/);

  if (!tokenMatch) {
    return res.status(401).json({ error: "Not authenticated with Google Fit" });
  }

  const accessToken = tokenMatch[1];

  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const response = await fetch(
    "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        aggregateBy: [
          { dataTypeName: "com.google.step_count.delta" },
        ],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: oneWeekAgo,
        endTimeMillis: now,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(data);
    return res.status(500).json(data);
  }

  const steps = data.bucket.map((b) => ({
    date: new Date(Number(b.startTimeMillis))
      .toISOString()
      .slice(0, 10),
    steps:
      b.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0,
  }));

  res.json(steps);
}
