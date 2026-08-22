import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MAX_NICKNAME_LENGTH } from './nickname';
import { readRememberedNickname, rememberNickname } from './nickname-store';

/** The key by its published name: what one game wrote, the next one reads. */
const STORAGE_KEY = 'word-crossword-game:nickname';

beforeEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('a browser that has not played yet', () => {
  it('remembers no name', () => {
    expect(readRememberedNickname()).toBe('');
  });
});

describe('a name a game was played under', () => {
  it('is what the next game is offered', () => {
    rememberNickname('Vik');

    expect(readRememberedNickname()).toBe('Vik');
  });

  it('gives way to the name played under after it', () => {
    rememberNickname('Vik');
    rememberNickname('Viktor');

    expect(readRememberedNickname()).toBe('Viktor');
  });
});

describe('a stored value the nickname rules would refuse', () => {
  it('is read as no name at all when it is longer than a nickname may be', () => {
    window.localStorage.setItem(STORAGE_KEY, 'x'.repeat(MAX_NICKNAME_LENGTH + 1));

    expect(readRememberedNickname()).toBe('');
  });

  it('is read as no name at all when it is nothing but whitespace', () => {
    window.localStorage.setItem(STORAGE_KEY, '   ');

    expect(readRememberedNickname()).toBe('');
  });

  it('comes back tidied up, so what is offered is what would be stored', () => {
    window.localStorage.setItem(STORAGE_KEY, '  Vik  the   player ');

    expect(readRememberedNickname()).toBe('Vik the player');
  });
});

describe('a browser whose storage cannot be reached', () => {
  /**
   * Storage that throws on every use, as a private window's does.
   *
   * Spied on the prototype rather than on `window.localStorage` itself: jsdom's
   * storage is a proxy that turns a property assignment into a stored item, so
   * a spy put on the object would quietly become an entry called `setItem`.
   */
  const poisoned = () => {
    const refuse = () => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    };

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(refuse);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(refuse);
  };

  it('remembers no name rather than throwing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    poisoned();

    expect(readRememberedNickname()).toBe('');
    // Proof the storage really was unreachable, rather than merely empty.
    expect(warn).toHaveBeenCalled();
  });

  it('survives being handed a name it has nowhere to keep', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    poisoned();

    expect(() => {
      rememberNickname('Vik');
    }).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });
});
