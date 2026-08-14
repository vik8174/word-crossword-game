import { describe, expect, it } from 'vitest';
import { auth, db, firebaseApp } from './config';

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
