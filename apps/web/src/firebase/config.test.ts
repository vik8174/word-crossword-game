import { describe, expect, it } from 'vitest';
import { auth, db, firebaseApp, readFirebaseConfig } from './config';

/** A fully populated env, so each test can knock out exactly one thing. */
const completeEnv = () => ({
  VITE_FIREBASE_API_KEY: 'key',
  VITE_FIREBASE_AUTH_DOMAIN: 'domain',
  VITE_FIREBASE_PROJECT_ID: 'project',
  VITE_FIREBASE_STORAGE_BUCKET: 'bucket',
  VITE_FIREBASE_MESSAGING_SENDER_ID: 'sender',
  VITE_FIREBASE_APP_ID: 'app',
  VITE_FIREBASE_MEASUREMENT_ID: 'measurement',
});

describe('readFirebaseConfig', () => {
  it('maps every env var onto the matching Firebase option', () => {
    expect(readFirebaseConfig(completeEnv())).toEqual({
      apiKey: 'key',
      authDomain: 'domain',
      projectId: 'project',
      storageBucket: 'bucket',
      messagingSenderId: 'sender',
      appId: 'app',
      measurementId: 'measurement',
    });
  });

  it('accepts a missing measurement id — Analytics is optional', () => {
    const config = readFirebaseConfig({
      ...completeEnv(),
      VITE_FIREBASE_MEASUREMENT_ID: undefined,
    });

    expect(config.measurementId).toBeUndefined();
    expect(config.projectId).toBe('project');
  });

  it('throws naming the missing variable', () => {
    expect(() =>
      readFirebaseConfig({ ...completeEnv(), VITE_FIREBASE_PROJECT_ID: undefined }),
    ).toThrow(/VITE_FIREBASE_PROJECT_ID/);
  });

  it('treats an empty value as missing', () => {
    expect(() => readFirebaseConfig({ ...completeEnv(), VITE_FIREBASE_API_KEY: '' })).toThrow(
      /VITE_FIREBASE_API_KEY/,
    );
  });

  it('names every missing variable at once, not just the first', () => {
    const call = () =>
      readFirebaseConfig({
        ...completeEnv(),
        VITE_FIREBASE_API_KEY: undefined,
        VITE_FIREBASE_APP_ID: undefined,
      });

    expect(call).toThrow(/VITE_FIREBASE_API_KEY/);
    expect(call).toThrow(/VITE_FIREBASE_APP_ID/);
  });

  it('points at the file that supplies the values', () => {
    expect(() => readFirebaseConfig({ ...completeEnv(), VITE_FIREBASE_APP_ID: undefined })).toThrow(
      /\.env\.example/,
    );
  });
});

describe('firebase config', () => {
  it('initializes the Firebase SDK without throwing', () => {
    expect(firebaseApp).toBeDefined();
    // Hardcoded against the fake value set in vitest.config.ts (`test.env`)
    // rather than re-reading `import.meta.env`, so this actually catches a
    // wrong env-var name in config.ts instead of trivially matching itself.
    expect(firebaseApp.options.projectId).toBe('test-project');
  });

  it('exposes Anonymous Auth and Firestore instances', () => {
    expect(auth).toBeDefined();
    expect(db).toBeDefined();
  });
});
