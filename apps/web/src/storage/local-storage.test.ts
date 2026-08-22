import { beforeEach, describe, expect, it, vi } from 'vitest';

import { storageFor } from './local-storage';

/**
 * Runs something in a browser whose storage cannot be reached at all.
 *
 * A private window and switched-off cookies do not answer with an empty store:
 * the property access itself throws, which is the case worth having a test for.
 */
const withUnreachableStorage = (run: () => void): void => {
  const own = Object.getOwnPropertyDescriptor(window, 'localStorage');

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get: () => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    },
  });

  try {
    run();
  } finally {
    if (own) {
      Object.defineProperty(window, 'localStorage', own);
    } else {
      Reflect.deleteProperty(window, 'localStorage');
    }
  }
};

const inStorage = storageFor('Something');

beforeEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('a browser with storage to keep things in', () => {
  it('answers with what was made of it', () => {
    window.localStorage.setItem('key', 'value');

    expect(inStorage('reading', (store) => store.getItem('key'), null)).toBe('value');
  });

  it('keeps what was put there', () => {
    inStorage('writing', (store) => store.setItem('key', 'value'), undefined);

    expect(window.localStorage.getItem('key')).toBe('value');
  });
});

describe('a browser whose storage cannot be reached', () => {
  it('answers with the fallback instead of throwing', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    withUnreachableStorage(() => {
      expect(inStorage('reading', (store) => store.getItem('key'), 'nothing')).toBe('nothing');
    });
  });

  it('says who wanted the storage, so the warning is not anonymous', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    withUnreachableStorage(() => {
      inStorage('reading the thing', (store) => store.getItem('key'), null);
    });

    expect(warn).toHaveBeenCalledWith('Something: reading the thing failed', expect.anything());
  });
});
