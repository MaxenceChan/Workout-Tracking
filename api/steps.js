import admin from "./lib/firebaseAdmin.js";

export default async function handler(req, res) {
  try {
    const { uid } = req.query;  // Récupérer l'UID de l'utilisateur
    if (!uid) return res.status(400).json({ error: "Missing uid" });  // Vérifier si l'UID est présent

    // 1. Récupérer les pas (exemple avec des données statiques ici, tu peux remplacer par Google Fit)
    const steps = [
      { date: "2025-01-10", steps: 7421 },
      { date: "2025-01-11", steps: 9032 },
    ];

    // 2. Écrire ces données dans Firestore pour l'utilisateur spécifié
    const db = admin.firestore();
    const batch = db.batch();  // Utilisation d'un batch pour écrire plusieurs documents à la fois

    steps.forEach((d) => {
      const ref = db
        .collection("users")  // Collection principale pour les utilisateurs
        .doc(uid)  // UID de l'utilisateur
        .collection("steps")  // Sous-collection des pas de l'utilisateur
        .doc(d.date);  // Utilisation de la date comme ID du document

      // Ajout des données dans le batch
      batch.set(ref, {
        steps: d.steps,
        date: d.date,
        updated_at: new Date().toISOString(),  // Horodatage de la mise à jour
      });
    });

    await batch.commit();  // Valider les écritures

    return res.status(200).json(steps);  // Réponse avec les données enregistrées
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to write steps to Firestore" });  // Erreur serveur
  }
}
