# 🏋️ Workout Tracker — Application de suivi d’entraînement

> **Workout Tracker** est une application web moderne permettant de **suivre, analyser et visualiser ses entraînements de musculation**, enrichie par la **synchronisation automatique des pas via Google Fit**, avec stockage cloud sécurisé et tableaux de bord interactifs.

🔗 **Application en ligne** :  
👉 https://workout-tracking-maxence.vercel.app

---

## 🚀 Fonctionnalités principales

### 📝 Suivi des séances (musculation)
- Création de séances **libres ou via templates**
- Gestion complète des exercices :
  - séries, répétitions, charges
  - calcul automatique du **tonnage**
- Chronomètres intégrés :
  - chrono global de séance
  - chrono par exercice
- Commentaires par exercice (ressenti, fatigue, etc.)

---

### 📊 Datavisualisation & analytics
Tableau de bord interactif avec :

- 📈 **Évolution du tonnage par exercice**
- 📈 **Évolution du tonnage par type de séance**
- 📉 **Intensité moyenne par séance** (kg / rep)
- 📊 **Tonnage sur les 3 dernières séances**
- 🍩 **Répartition des types de séances (30 derniers jours)**
- 📆 **Calendrier mensuel des séances**
- 🔢 **Fréquence moyenne d’entraînement**
  - période personnalisable (date début / date fin)
  - calcul :
    ```
    fréquence = nombre de séances / (nombre de jours / 7)
    ```

---

### 👣 Suivi des pas — Google Fit
- Connexion **Google Fit** via OAuth
- Synchronisation automatique des pas :
  - import des derniers jours à la première connexion
  - mise à jour quotidienne
- Visualisation via un **calendrier mensuel** :
  - bulles proportionnelles au nombre de pas
  - clic sur un jour → détail du total journalier
- Données stockées et historisées dans Firestore

---

### ⚖️ Suivi du poids
- Saisie du poids avec date
- Graphique d’évolution du poids
- Historique éditable :
  - modification
  - suppression
- Données synchronisées en **temps réel**

---

### 🗂️ Historique & gestion
- Liste complète des séances
- Filtres par type de séance
- Édition des séances existantes
- Suppression sécurisée
- Export des séances en **image (PNG)** :
  - compatible mobile (Android / iOS)
  - partage natif ou téléchargement

---

### 🎨 Expérience utilisateur
- 🌙 **Mode clair / mode sombre**
- 📱 Design **responsive** (mobile / desktop)
- 💾 Sauvegarde automatique locale (anti-perte)
- ⚡ Synchronisation temps réel via Firestore
- UX pensée pour un usage sportif réel

---

## 🛠️ Stack technique

### Frontend
- **React** (hooks, composants fonctionnels)
- **Recharts** → graphiques interactifs
- **Tailwind CSS** → design moderne & responsive
- **Lucide Icons**
- **html2canvas** → export des séances en image

---

### Backend & Cloud
- **Firebase Authentication**
  - Email / mot de passe
  - Google OAuth
- **Firebase Firestore**
  - Base NoSQL temps réel
  - Sécurité via règles Firestore
  - Collections principales :
    - `sessions`
    - `session_templates`
    - `weights`
    - `steps`
- **Google Fit API**
  - Récupération sécurisée des données de pas
- **Vercel**
  - Déploiement continu
  - Serverless Functions (OAuth & synchronisation)
  - HTTPS automatique

---

## 🔐 Sécurité & données
- Authentification obligatoire
- Données **strictement isolées par utilisateur**
- Règles Firestore strictes :
  - lecture / écriture autorisées uniquement au propriétaire
- Tokens Google Fit gérés côté serveur
- Aucune donnée sensible exposée côté client

---

## 📂 Architecture du projet (simplifiée)

```text
api/
├── auth/          # OAuth Google Fit
├── steps.js         # Synchronisation des pas
└── lib/           # Firebase Admin & helpers

src/
├── App.jsx        # Application principale
├── firebase.js    # Configuration Firebase
├── main   
├── index.css       
└── 
```

---

## 📈 Objectifs du projet

- Créer une **application réellement utilisable** au quotidien
- Mettre en pratique :
  - React avancé
  - Firebase (auth + Firestore)
  - Data visualisation
- Avoir un projet **portfolio solide** orienté :
  - Data
  - Produit
  - UX
- Préparer des évolutions futures :
  - comparaison de périodes
  - statistiques avancées
  - indicateurs de progression

---

## 👤 Auteur

**Maxence Chan**  
Étudiant en Data / Économétrie & Statistiques  
Projet personnel — full design, logique métier et implémentation

---

## 📜 Licence & propriété intellectuelle

Ce projet est développé et maintenu par **Maxence Chan**.

Le code source est protégé par la licence **MIT**.  
Toute réutilisation doit mentionner explicitement l’auteur.

© 2025 — Tous droits réservés.
