// src/firebase.js
import { initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// ⚠️ Remplace ces valeurs par celles de la console Firebase -> Project settings -> Your apps (Web)
export const firebaseConfig = {
  apiKey: 'AIzaSyAuN2C91wSJSJ9gvDd0fXseNkXVtm1l9vc',
  authDomain: 'workout-tracking-12e5d.firebaseapp.com',
  projectId: 'workout-tracking-12e5d',
  storageBucket: 'workout-tracking-12e5d.firebasestorage.app',
  messagingSenderId: '401248058371',
  appId: '1:401248058371:web:e2a2963b1d4780cc4f6236',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Connexion automatique anonyme : déclenche le callback quand le user est prêt
export function ensureAnonLogin(onReady) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      await signInAnonymously(auth)
      return // onAuthStateChanged sera rappelé
    }
    onReady?.(user)
  })
}
