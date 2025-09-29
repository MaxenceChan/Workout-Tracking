# Workout Tracker – Firebase Auth (Email/Password + Google) + Firestore + Vite + Tailwind

## ⚡ Étapes Firebase
1. **Authentication → Sign-in method** : Active **Email/Password** et éventuellement **Google**.
2. **Firestore Database** : Crée la base (mode production).
3. **Project settings → Web app** : copie la config web et remplace `REPLACE_ME` dans `src/firebase.js`.

## 🔒 Règles Firestore
rules_version = '2';
service cloud.firestore {
match /databases/{database}/documents {
match /sessions/{doc} {
allow read, write: if request.auth != null && request.auth.uid == request.resource.data.user_id;
}
}
}

## 🚀 Déploiement Vercel
- Build: `npm run build`
- Output: `dist`

## 🔑 Auth
- Login obligatoire à l’entrée (Email/Password ou Google).
- Les données sont stockées dans Firestore (`sessions` par user).
