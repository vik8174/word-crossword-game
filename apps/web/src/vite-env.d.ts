/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;
  /** `1` in `.env.e2e` only: connects Auth and Firestore to the local emulators (`firebase/services.ts`). */
  readonly VITE_USE_EMULATORS?: string;
  readonly VITE_EMULATOR_FIRESTORE_PORT?: string;
  readonly VITE_EMULATOR_AUTH_PORT?: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_SENTRY_ENVIRONMENT: string;
  /** The release name `vite.config.ts` injects (package version + revision); absent in dev and tests. */
  readonly VITE_SENTRY_RELEASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
