import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

import { firebaseApp } from './config';

/**
 * The two Firebase services a game runs on, and the reason they are not in
 * `config.ts` next to the app they come from.
 *
 * Importing this module is what pulls the Auth and Firestore SDKs into a
 * bundle, and Firestore alone is the largest single thing this app ships. Only
 * the screens that read or write a room need them: the landing page signs
 * nobody in and subscribes to nothing. Keeping them apart from `firebaseApp` is
 * what lets the landing page load without them — `config.ts` is imported by the
 * analytics, which runs on every page, so anything living there is on the first
 * screen by definition (issue #92).
 *
 * Both are created when this module is first imported, which is when the route
 * that needs them is opened.
 */

/** Anonymous sign-in, which every player goes through before touching a room. */
export const auth = getAuth(firebaseApp);

/** The database the rooms live in. */
export const db = getFirestore(firebaseApp);

/**
 * Points both services at the local emulators, for the end-to-end build only.
 *
 * Two switches must both be on: the build mode is `e2e` (`vite build --mode e2e`)
 * and `VITE_USE_EMULATORS` is `1` (set by `apps/web/.env.e2e`). The mode check is
 * what keeps a stage or production build from ever turning this on, even by a
 * stray variable: those builds run in mode `production`.
 *
 * It is written as a bare `if` on `import.meta.env` reads, not as a function
 * taking the env, on purpose: Vite replaces those reads with literals at build
 * time, so in every other build the whole block, the addresses and the log line
 * with it, is removed from the bundle. Handed over as an object they would not
 * be, and the addresses would ship. `scripts/check-emulator-leak.mjs` proves the
 * block is gone on every CI run.
 */
if (import.meta.env.MODE === 'e2e' && import.meta.env.VITE_USE_EMULATORS === '1') {
  connectFirestoreEmulator(
    db,
    '127.0.0.1',
    Number(import.meta.env.VITE_EMULATOR_FIRESTORE_PORT ?? '8080'),
  );
  connectAuthEmulator(
    auth,
    `http://127.0.0.1:${import.meta.env.VITE_EMULATOR_AUTH_PORT ?? '9099'}`,
    { disableWarnings: true },
  );
  console.info('Firebase: Auth and Firestore are on the local emulators (e2e build).');
}
