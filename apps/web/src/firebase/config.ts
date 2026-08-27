import { type FirebaseOptions, initializeApp } from 'firebase/app';

/**
 * Env vars without which Auth and Firestore cannot work.
 *
 * `VITE_FIREBASE_MEASUREMENT_ID` is deliberately absent: it only feeds
 * Analytics, and the Firebase console omits it entirely for projects with no
 * Google Analytics attached. Hard-failing the whole app over an optional
 * feature would be worse than the silent `undefined` this validation replaces.
 *
 * Real values live in `apps/web/.env` (git-ignored, never committed).
 * See `apps/web/.env.example` for the variable names and setup notes.
 */
const REQUIRED_ENV_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

/** Env shape this module reads — a subset of `import.meta.env`. */
type FirebaseEnv = Readonly<
  Record<(typeof REQUIRED_ENV_VARS)[number] | 'VITE_FIREBASE_MEASUREMENT_ID', string | undefined>
>;

/**
 * Builds the Firebase config from env vars, failing fast if any is missing.
 *
 * This is a system boundary: without validation an absent variable reaches
 * `initializeApp` as `undefined` and surfaces much later as an unrelated
 * error. Empty strings count as missing — `.env.example` ships the keys blank.
 *
 * @param env - Env source to read from (production passes `import.meta.env`)
 * @returns Firebase options with every required value present
 * @throws Error naming every missing required variable and how to supply it
 */
export const readFirebaseConfig = (env: FirebaseEnv): FirebaseOptions => {
  const missing = REQUIRED_ENV_VARS.filter((name) => !env[name]);

  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase env vars: ${missing.join(', ')}. ` +
        'Copy apps/web/.env.example to apps/web/.env and fill in the values ' +
        'from the Firebase console.',
    );
  }

  return {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
  };
};

/**
 * The Firebase app itself, and nothing that runs on it.
 *
 * Auth and Firestore are next door in `services.ts` on purpose: this module is
 * reached from the analytics, so it is part of every page, and the two SDKs are
 * only wanted on the screens that open a room (issue #92).
 */
export const firebaseApp = initializeApp(readFirebaseConfig(import.meta.env));
