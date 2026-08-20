import { FirebaseError } from 'firebase/app';
import { describe, expect, it } from 'vitest';

import { wasRefusedByRules } from './refusal';

describe('wasRefusedByRules', () => {
  it('recognises the rules turning a write down', () => {
    expect(
      wasRefusedByRules(
        new FirebaseError('permission-denied', 'Missing or insufficient permissions.'),
      ),
    ).toBe(true);
  });

  it('does not take a database nobody could reach for a refusal', () => {
    expect(wasRefusedByRules(new FirebaseError('unavailable', 'The client is offline.'))).toBe(
      false,
    );
    expect(wasRefusedByRules(new FirebaseError('deadline-exceeded', 'Deadline exceeded.'))).toBe(
      false,
    );
  });

  it('does not take a failed sign-in for a refused write', () => {
    expect(
      wasRefusedByRules(new FirebaseError('auth/network-request-failed', 'A network error.')),
    ).toBe(false);
  });

  it('answers for anything a catch block can receive, Firebase or not', () => {
    expect(wasRefusedByRules(new Error('Missing or insufficient permissions.'))).toBe(false);
    expect(wasRefusedByRules({ code: 'permission-denied' })).toBe(false);
    expect(wasRefusedByRules('permission-denied')).toBe(false);
    expect(wasRefusedByRules(null)).toBe(false);
    expect(wasRefusedByRules(undefined)).toBe(false);
  });
});
