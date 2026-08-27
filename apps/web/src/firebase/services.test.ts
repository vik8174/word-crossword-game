import { describe, expect, it } from 'vitest';
import { auth, db } from './services';

describe('firebase services', () => {
  it('exposes Anonymous Auth and Firestore instances', () => {
    expect(auth).toBeDefined();
    expect(db).toBeDefined();
  });

  it('runs both on the app the config built', () => {
    expect(db.app.options.projectId).toBe('test-project');
    expect(auth.app).toBe(db.app);
  });
});
