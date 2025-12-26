import admin from "./lib/firebaseAdmin.js";

const formatMonth = (value) => (typeof value === "string" ? value.slice(0, 7) : "");

export default async function handler(req, res) {
  try {
    const { monthStart = "", monthEnd = "" } = req.query;
    const db = admin.firestore();
    const sessionsRef = db.collection("sessions");
    const loginsRef = db.collection("logins");
    const todayMonth = new Date().toISOString().slice(0, 7);

    const [minSnap, maxSnap] = await Promise.all([
      sessionsRef.orderBy("date", "asc").limit(1).get(),
      sessionsRef.orderBy("date", "desc").limit(1).get(),
    ]);

    const minMonth = minSnap.empty ? "" : formatMonth(minSnap.docs[0].get("date"));
    const maxMonth = maxSnap.empty ? "" : formatMonth(maxSnap.docs[0].get("date"));

    const resolvedStart = monthStart || minMonth || todayMonth;
    const resolvedEnd = monthEnd || maxMonth || todayMonth;

    let queryRef = sessionsRef;
    if (resolvedStart) {
      queryRef = queryRef.where("date", ">=", `${resolvedStart}-01`);
    }
    if (resolvedEnd) {
      queryRef = queryRef.where("date", "<=", `${resolvedEnd}-31`);
    }

    const snapshot = await queryRef.get();
    const rows = snapshot.docs.map((docSnap) => docSnap.data() || {});
    const missingUserIds = new Set();

    rows.forEach((data) => {
      if (!data.user_email && data.user_id) {
        missingUserIds.add(data.user_id);
      }
    });

    const loginEmailByUserId = new Map();
    const missingIds = Array.from(missingUserIds);
    const chunkSize = 10;
    for (let i = 0; i < missingIds.length; i += chunkSize) {
      const chunk = missingIds.slice(i, i + chunkSize);
      const loginSnap = await loginsRef.where("user_id", "in", chunk).get();
      loginSnap.forEach((docSnap) => {
        const login = docSnap.data() || {};
        if (!login.user_id || !login.user_email) return;
        const existing = loginEmailByUserId.get(login.user_id);
        if (!existing || (login.date || "") > (existing.date || "")) {
          loginEmailByUserId.set(login.user_id, {
            email: login.user_email,
            date: login.date,
          });
        }
      });
    }

    const tally = new Map();
    rows.forEach((data) => {
      const identifier =
        data.user_email ||
        loginEmailByUserId.get(data.user_id)?.email ||
        "Email indisponible";
      tally.set(identifier, (tally.get(identifier) || 0) + 1);
    });

    const rankedRows = Array.from(tally.entries())
      .map(([email, count]) => ({ email, count }))
      .sort((a, b) => b.count - a.count || a.email.localeCompare(b.email));

    return res.status(200).json({
      rows: rankedRows,
      minMonth: minMonth || todayMonth,
      maxMonth: maxMonth || todayMonth,
      startMonth: resolvedStart,
      endMonth: resolvedEnd,
    });
  } catch (error) {
    console.error("Ranking error:", error);
    return res.status(500).json({ error: "Failed to load ranking" });
  }
}
