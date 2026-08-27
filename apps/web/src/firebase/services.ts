import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
