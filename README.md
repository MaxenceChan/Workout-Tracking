# 🏋️ Workout Tracker — Application de suivi d'entraînement

> **Workout Tracker** est une application web moderne permettant de **suivre, analyser et visualiser ses entraînements de musculation**, enrichie par la **synchronisation automatique des pas via Google Fit**, le **suivi des courses via Strava**, et un suivi du poids avec stockage cloud sécurisé et tableaux de bord interactifs.

🔗 **Application en ligne** :
👉 https://workout-tracking-maxence.vercel.app

---

## 🚀 Fonctionnalités principales

### 📝 Saisie d'une séance

- Création de séances **libres ou via modèles** (templates)
- **Création de modèles à la volée** pendant une séance (pop-up catégorisation)
- Gestion complète des exercices :
  - séries, répétitions, charges
  - calcul automatique du **tonnage** par exercice et global
  - prefill automatique des charges depuis la dernière séance contenant l'exercice
- **Chronomètre figé** depuis le début de la séance (anti-reset accidentel)
- **Timer de repos** intégré (3 min par défaut entre les séries)
- **Renommer un exercice** en cours de séance (avec confirmation de catégorisation)
- **Commentaires par exercice** (ressenti, technique, RPE…) — disponibles en saisie, édition et lecture
- Réordonner les exercices (drag-and-drop / boutons de déplacement)
- Suggestion intelligente de modèle de séance pour le jour

### 🎯 Pop-up catégorisation intelligente

Quand l'utilisateur modifie une séance modèle (ajout/rename d'exercice ou édition du titre), un pop-up demande explicitement comment recatégoriser la séance :

- **Garder** le modèle existant
- **Passer en Séance libre**
- **Créer un nouveau type** (sera automatiquement sauvegardé en modèle à l'enregistrement)

Le pop-up est **non-dismissable en mode rename** pour éviter les ambiguïtés.

### 🧾 Récap fin de séance

À la fin de chaque séance enregistrée (et accessible aussi depuis l'historique) :

- Durée, tonnage total
- Comparaison globale **vs dernière séance du même modèle** (% de progression)
- Comparaison **par exercice** vs dernière performance
- Message dynamique selon la progression (positive / stable / encourageant)
- Pour les **séances libres** : pas de comparaison globale (exercices variables), seulement le détail par exercice

### 📊 Statistiques & data-visualisation

Tableau de bord interactif avec :

- 📈 **Évolution du tonnage par exercice**
- 📈 **Évolution du tonnage par type de séance**
- 📉 **Intensité moyenne par séance** (kg / rep)
- 📊 **Tonnage sur les 3 dernières séances**
- 🍩 **Répartition des types de séances** (30 derniers jours)
- 📆 **Calendrier mensuel** des séances et activités
- 🔢 **Fréquence moyenne d'entraînement** (période personnalisable)
- 🏅 **Score de forme** pondéré (séances + pas + course)

### 👣 Suivi des pas — Google Fit (temps réel)

Architecture multi-sources avec **médiane** pour un affichage proche de l'app Google Fit officielle :

- **3 sources interrogées en parallèle** :
  - `estimated_steps` (avec gap-fill Google)
  - `merge_step_deltas` (live, fusion des devices)
  - auto-merge via `dataTypeName`
- **Médiane par jour** entre les sources non-nulles → robustesse à 1 source en panne, valeur proche de Google Fit
- **Fetch différentiel** : 14 derniers jours en polling, 365 jours au premier login (zéro trou même après une longue absence)
- **Chunking** en fenêtres de 30 jours pour respecter la limite Google Fit (« aggregate duration too large » sur les windows trop larges)
- **Rate limit** in-memory de 30 req/min/uid pour bloquer le spam
- Côté frontend :
  - Polling auto **toutes les 5 min** quand le tab est visible
  - Revalidation sur **retour de focus** (> 30 s caché)
  - Revalidation sur **reconnexion réseau**
  - **Dédup intra-tab** + **multi-tab** via `BroadcastChannel`
  - Timeout 30 s + `AbortController` sur les fetches pour ne pas bloquer sur une requête hung
- **Calendrier mensuel** avec bulles proportionnelles + détail du jour sélectionné toujours visible (panneau permanent)
- Filtres période : **Cette semaine**, **All time** ou plage personnalisée

### 🏃 Suivi des courses — Strava

- Connexion **Strava** via OAuth
- Récupération automatique des activités de course
- Distance hebdomadaire, allure, dénivelé
- Détail d'activité dans l'historique (fiche détaillée pour les courses)

### ⚖️ Suivi du poids

- Saisie du poids avec date
- Graphique d'évolution
- Historique éditable (modification / suppression)
- Synchronisation **temps réel**

### 🗂️ Historique & gestion

- Liste complète des séances + courses
- **Filtres par type** : Tout, Course, Modèles dans l'ordre, Séance libre en dernier
- **Calendrier mensuel** avec point de couleur selon le type (muscu / run)
- Fiche détail avec :
  - Édition du **type de séance** (clic sur le titre)
  - Édition des exercices et séries (durée d'origine préservée)
  - **Voir le récap** (vs dernières perfs) — réutilisation du composant de fin de séance
  - **Partage en image PNG** (compatible Android / iOS, partage natif ou téléchargement)
  - Suppression confirmée
  - Scroll automatique en haut à l'ouverture
- **Renommage de séance** depuis l'édition d'historique

### 🧰 Onglet Séances (modèles)

- Liste **triée alphabétiquement** des modèles
- Création / édition / suppression de modèles
- Démarrer une séance directement depuis un modèle (prefill des charges depuis l'historique)
- Prévention des doublons sur le nom de modèle (refus + message d'erreur)

### 🎨 Expérience utilisateur

- 🌙 Mode clair / mode sombre
- 📱 Design **responsive** mobile-first avec navigation bottom-tabs
- 💾 Sauvegarde automatique locale (anti-perte)
- ⚡ Synchronisation temps réel via Firestore
- 🔄 Refresh forcé au premier mount de page (pas/séances frais à chaque rechargement)
- UX pensée pour un usage sportif réel

---

## 🛠️ Stack technique

### Frontend

- **React 18** (hooks, composants fonctionnels)
- **Vite** → build & dev server ultra-rapide
- **Recharts** → graphiques interactifs
- **Tailwind CSS** → design moderne & responsive
- **shadcn/ui** + **Radix UI** → composants accessibles
- **Lucide Icons**
- **html2canvas** → export PNG des séances
- **Hook custom `useLiveSteps`** : polling, dédup, multi-tab, revalidation

### Backend & Cloud

- **Firebase Authentication** (Email / Google OAuth)
- **Firebase Firestore** (base NoSQL temps réel)
  - Collections : `sessions`, `session_templates`, `weights`, `users` (avec sous-doc `stepsCache` + `googleFit`)
  - Règles strictes : lecture / écriture autorisées uniquement au propriétaire
- **Google Fit API** (REST, OAuth, scope `fitness.activity.read`)
- **Strava API** (REST, OAuth)
- **Vercel**
  - Déploiement continu sur push `main`
  - **Serverless Functions** (Node 20) pour OAuth + synchronisation
  - HTTPS automatique

### Architecture des appels Google Fit

```
User device (montre, tel) → Google Fit (serveur)
                                   ↓
        /api/steps?uid=X (Vercel serverless)
                                   ↓
        ┌─────────────────────────┴─────────────────────────┐
        │ Rate limit (30/min/uid) → Firestore (cache+token) │
        │ → 3 sources en parallèle × N chunks de 30 jours   │
        │ → Median par jour (filtré non-zero)                │
        │ → Merge avec cache Firestore (fresh > 0 wins)      │
        │ → Update Firestore si changements                  │
        └─────────────────────────┬─────────────────────────┘
                                   ↓
            Frontend (cache localStorage 5 min + state React)
```

---

## 🔐 Sécurité & données

- Authentification obligatoire (toutes les routes protégées)
- Données **strictement isolées par utilisateur** via `user_id`
- Règles Firestore strictes (lecture / écriture par propriétaire uniquement)
- **Tokens OAuth** Google Fit & Strava gérés côté serveur Vercel, jamais exposés au client
- **Refresh tokens** stockés en Firestore, chiffrés au niveau base
- Aucune donnée sensible exposée côté client
- Endpoints serverless avec **rate limiting** in-memory

---

## 📂 Architecture du projet (simplifiée)

```text
api/
├── auth/                       # Callbacks OAuth (Google Fit, Strava)
├── steps.js                    # Synchronisation des pas (multi-source, médiane)
├── strava.js                   # Récupération des activités Strava
├── traction.js                 # API pré-créée (futur)
├── ranking.js                  # Classement (futur)
└── lib/
    └── firebaseAdmin.js        # Firebase Admin SDK

src/
├── App.jsx                     # Application principale (8000+ lignes, mobile + desktop)
├── firebase.js                 # Configuration Firebase client
├── components/
│   └── StepsMonthlyBubbleChart.jsx
├── main.jsx
└── index.css

vercel.json                     # Routes & rewrites
package.json                    # Dépendances Node + scripts
```

---

## ⚙️ Variables d'environnement

```bash
# Firebase Admin (serverless)
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY

# Google Fit OAuth
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI

# Strava OAuth
STRAVA_CLIENT_ID
STRAVA_CLIENT_SECRET
STRAVA_REDIRECT_URI

# Firebase client (préfixés VITE_)
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

---

## 🧪 Endpoints de debug

L'API `/api/steps` expose des paramètres utiles pour diagnostiquer :

- `?debug=1` → retourne par source les 10 derniers jours + le `fetchMode` (`recent-14d` ou `full-365d`) + les `sourceErrors` éventuels
- `?reset=1` → wipe le `stepsCache` Firestore pour forcer une reconstruction
- `?full=1` → force un fetch des 365 jours (bypass du mode différentiel)

---

## 📈 Objectifs du projet

- Créer une **application réellement utilisable** au quotidien
- Mettre en pratique :
  - React avancé (hooks custom, contexts, optimisations)
  - Firebase (auth + Firestore + Admin SDK)
  - Architecture serverless (Vercel Functions)
  - Intégrations OAuth (Google Fit, Strava)
  - Data visualisation
- Avoir un projet **portfolio solide** orienté Data / Produit / UX
- Préparer des évolutions futures :
  - Comparaison de périodes
  - Statistiques avancées
  - Indicateurs de progression
  - Module Traction (à venir)
  - Classement multi-utilisateurs

---

## 👤 Auteur

**Maxence Chan**
Étudiant en Data / Économétrie & Statistiques
Projet personnel — design complet, logique métier et implémentation

---

## 📜 Licence & propriété intellectuelle

Ce projet est développé et maintenu par **Maxence Chan**.

Le code source est protégé par la licence **MIT**.
Toute réutilisation doit mentionner explicitement l'auteur.

© 2025-2026 — Tous droits réservés.
