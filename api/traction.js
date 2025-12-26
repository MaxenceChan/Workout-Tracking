import admin from "./lib/firebaseAdmin.js";

const PARIS_TIMEZONE = "Europe/Paris";
const DEFAULT_AUTH_EMAIL = "traction@workout-tracker.fr";
const ACTIVE_WINDOW_DAYS = 30;

const normalizeEmail = (email) => (email || "").trim().toLowerCase();
const formatDate = (date) =>
  date.toLocaleDateString("fr-CA", { timeZone: PARIS_TIMEZONE });

const buildDateRange = (startDate, endDate) => {
  const dates = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    dates.push(formatDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization || "";
  const tokenMatch = authHeader.match(/^Bearer (.+)$/);
  if (!tokenMatch) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(tokenMatch[1]);
    const allowedEmail = process.env.TRACTION_AUTH_EMAIL || DEFAULT_AUTH_EMAIL;

    if (normalizeEmail(decoded.email) !== normalizeEmail(allowedEmail)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const days = Math.min(
      Math.max(parseInt(req.query.days || "30", 10) || 30, 7),
      365
    );

    const db = admin.firestore();
    const sessionsRef = db.collection("sessions");
    const loginsRef = db.collection("logins");

    let totalSessions = 0;
    try {
      const countSnap = await sessionsRef.count().get();
      totalSessions = countSnap.data().count || 0;
    } catch (error) {
      const totalSnap = await sessionsRef.get();
      totalSessions = totalSnap.size;
    }

    const activeStart = new Date();
    activeStart.setDate(activeStart.getDate() - (ACTIVE_WINDOW_DAYS - 1));
    const activeStartKey = formatDate(activeStart);

    const activeSnap = await sessionsRef
      .where("date", ">=", activeStartKey)
      .get();

    const activeUsers = new Set();
    activeSnap.forEach((doc) => {
      const row = doc.data();
      const key = row.user_id || row.user_email;
      if (key) activeUsers.add(key);
    });

    const loginStart = new Date();
    loginStart.setDate(loginStart.getDate() - (days - 1));
    const loginStartKey = formatDate(loginStart);

    const loginSnap = await loginsRef.where("date", ">=", loginStartKey).get();
    const loginCounts = new Map();
    loginSnap.forEach((doc) => {
      const row = doc.data();
      if (!row?.date) return;
      loginCounts.set(row.date, (loginCounts.get(row.date) || 0) + 1);
    });

    const today = new Date();
    const loginsDaily = buildDateRange(loginStart, today).map((date) => ({
      date,
      count: loginCounts.get(date) || 0,
    }));

    const totalLogins = loginsDaily.reduce((sum, row) => sum + row.count, 0);

    return res.status(200).json({
      activeUsers: activeUsers.size,
      totalSessions,
      loginsDaily,
      totalLogins,
    });
  } catch (error) {
    console.error("Traction error:", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
}
