// src/firebase.js
import { initializeApp } from 'firebase/app'
import {
  getAuth, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup, signOut
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// ⚠️ Mets ici ta config (Firebase console → Project settings → Your apps → Web)
export const firebaseConfig = {
  apiKey: "AIzaSyAuN2C91wSJSJ9gvDd0fXseNkXVtm1l9vc",
  authDomain: "workout-tracking-12e5d.firebaseapp.com",
  projectId: "workout-tracking-12e5d",
  storageBucket: "workout-tracking-12e5d.firebasestorage.app",
  messagingSenderId: "401248058371",
  appId: "1:401248058371:web:e2a2963b1d4780cc4f6236",
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

export const onAuth = (cb) => onAuthStateChanged(auth, cb)

export async function signUpEmail(email, password) {
  return await createUserWithEmailAndPassword(auth, email, password)
}
export async function signInEmail(email, password) {
  return await signInWithEmailAndPassword(auth, email, password)
}
export async function signInGoogle() {
  const provider = new GoogleAuthProvider()
  return await signInWithPopup(auth, provider)
}
export async function signOutUser() {
  return await signOut(auth)
}
