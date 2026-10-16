import { describe, expect, it } from 'vitest';

import { claimAutomaticReload } from './reload-mark';

const memoryStorage = () => {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
};

describe('claimAutomaticReload', () => {
  it('allows one reload per release, then none', () => {
    const storage = memoryStorage();

    expect(claimAutomaticReload('1.3.0+aaa', storage)).toBe(true);
    expect(claimAutomaticReload('1.3.0+aaa', storage)).toBe(false);
    expect(claimAutomaticReload('1.3.0+aaa', storage)).toBe(false);
  });

  it('gives a new release its own one reload', () => {
    const storage = memoryStorage();
    claimAutomaticReload('1.3.0+aaa', storage);

    expect(claimAutomaticReload('1.3.0+bbb', storage)).toBe(true);
    expect(claimAutomaticReload('1.3.0+bbb', storage)).toBe(false);
  });

  it('treats a build with no release as one release', () => {
    const storage = memoryStorage();

    expect(claimAutomaticReload(undefined, storage)).toBe(true);
    expect(claimAutomaticReload(undefined, storage)).toBe(false);
  });

  it('does not reload when storage cannot be used, because it could loop', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };

    expect(claimAutomaticReload('1.3.0+aaa', blocked)).toBe(false);
  });
});
