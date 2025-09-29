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
  apiKey: 'REPLACE_ME',
  authDomain: 'REPLACE_ME.firebaseapp.com',
  projectId: 'REPLACE_ME',
  storageBucket: 'REPLACE_ME.appspot.com',
  messagingSenderId: 'REPLACE_ME',
  appId: 'REPLACE_ME',
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
