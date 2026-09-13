import type { FirebaseApp } from 'firebase/app';

/**
 * Storybook's substitute for `src/firebase/config.ts`, aliased in
 * `.storybook/main.ts`.
 *
 * A story never talks to Firebase (issue #182, AC 4), so nothing here calls
 * `initializeApp`. `telemetry/analytics.ts` is reached by every page through
 * `useScreenReached`, and it only ever asks whether Analytics is supported
 * before trying to start it on `firebaseApp` — a call its own
 * `analyticsWhenAvailable` already wraps in a `.catch` that logs a console
 * warning and moves on, for a project with no measurement id configured, so an
 * app never registered with `initializeApp` fails the same quiet way.
 * `firebaseApp` only has to look enough like the real thing for that call to
 * be attempted at all.
 */
export const firebaseApp: FirebaseApp = {
  name: '[DEFAULT]',
  options: {},
  automaticDataCollectionEnabled: false,
};
