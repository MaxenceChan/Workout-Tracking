# Workout Tracker – Firebase (Anonymous) + Firestore + Vite + Tailwind

## 1) Créer le projet Firebase
- Console Firebase → **Add project**
- **Authentication → Sign-in method → Anonymous** → Enable
- **Firestore Database** → Create database (mode production)
- Récupère la **config Web** du projet (apiKey, authDomain, projectId, ...)

## 2) Mettre la config
Édite `src/firebase.js` et remplace les `REPLACE_ME` par tes vraies valeurs.

## 3) Règles de sécurité Firestore
Dans *Firestore → Rules* :
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sessions/{doc} {
      allow read, write: if request.auth != null && request.auth.uid == request.resource.data.user_id;
    }
  }
}
```
Clique **Publish**.

## 4) Lancer en local (optionnel)
```bash
npm install
npm run dev
```
Ouvre http://localhost:5173

## 5) Déploiement Vercel
- Push sur GitHub et connecte le repo à Vercel
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

## 6) Sync
- Auto-login **anonyme** au chargement.
- Lit `sessions` où `user_id == uid` (FireStore).
- Si cloud vide & local non vide → **push** local une fois.
- Sinon, **remplace** local par cloud.
- Chaque changement local **upsert** vers Firestore.
