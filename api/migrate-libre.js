import admin from "./lib/firebaseAdmin.js";

// Endpoint de migration one-shot : renomme type "Libre" → "Séance libre"
// dans les collections sessions et sessionTemplates
// À SUPPRIMER après exécution.

export default async function handler(req, res) {
  // Sécurité minimale : clé secrète dans le query param
  const { secret } = req.query;
  if (secret !== process.env.MIGRATION_SECRET && secret !== "migrate-libre-2026") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const db = admin.firestore();
  const results = { sessions: 0, templates: 0, errors: [] };

  try {
    // 1. Sessions avec type === "Libre"
    const sessionsSnap = await db.collectionGroup("sessions")
      .where("type", "==", "Libre")
      .get();

    const sessionBatch = db.batch();
    sessionsSnap.docs.forEach(doc => {
      sessionBatch.update(doc.ref, { type: "Séance libre" });
      results.sessions++;
    });
    if (results.sessions > 0) await sessionBatch.commit();
  } catch (e) {
    results.errors.push(`sessions: ${e.message}`);
  }

  try {
    // 2. Templates avec name === "Libre"
    const tplSnap = await db.collectionGroup("sessionTemplates")
      .where("name", "==", "Libre")
      .get();

    const tplBatch = db.batch();
    tplSnap.docs.forEach(doc => {
      tplBatch.update(doc.ref, { name: "Séance libre" });
      results.templates++;
    });
    if (results.templates > 0) await tplBatch.commit();
  } catch (e) {
    results.errors.push(`templates: ${e.message}`);
  }

  return res.status(200).json({
    message: "Migration terminée",
    sessionsUpdated: results.sessions,
    templatesUpdated: results.templates,
    errors: results.errors,
  });
}
