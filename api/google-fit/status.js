export default function handler(req, res) {
  const token = req.cookies?.google_fit_token;

  res.status(200).json({
    connected: Boolean(token),
  });
}
