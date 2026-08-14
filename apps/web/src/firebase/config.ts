import { type FirebaseOptions, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase project configuration, sourced from build-time env vars.
 *
 * Real values live in `apps/web/.env` (git-ignored, never committed).
 * See `apps/web/.env.example` for the variable names and setup notes.
 */
const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
