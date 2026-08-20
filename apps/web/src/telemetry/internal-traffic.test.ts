import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyInternalTrafficMark,
  internalTrafficParams,
  isInternalTraffic,
} from './internal-traffic';

/** Opens the app at an address, as a fresh load of that address would. */
const openAt = (address: string) => window.history.replaceState({}, '', address);

/** The address bar as it stands, path and query only. */
const addressBar = () => `${window.location.pathname}${window.location.search}`;

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

beforeEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  openAt('/');
});

describe('a browser nobody marked', () => {
  it('is not internal traffic', () => {
    expect(isInternalTraffic()).toBe(false);
  });

  it('adds nothing to what its events carry', () => {
    expect(internalTrafficParams()).toEqual({});
  });

  it('is left alone by an address with no mark in it', () => {
    openAt('/create');

    applyInternalTrafficMark();

    expect(isInternalTraffic()).toBe(false);
    expect(addressBar()).toBe('/create');
  });
});

describe('marking a browser', () => {
  it('is done by opening any page with the mark in the address', () => {
    openAt('/?internal=1');

    applyInternalTrafficMark();

    expect(isInternalTraffic()).toBe(true);
    expect(internalTrafficParams()).toEqual({ traffic_type: 'internal' });
  });

  it('holds without the address being opened again', () => {
    openAt('/?internal=1');
    applyInternalTrafficMark();

    // The next load, of a plain address, as every later visit will be.
    openAt('/create');
    applyInternalTrafficMark();

    expect(isInternalTraffic()).toBe(true);
  });

  it('takes the mark back out of the address, so a copied link does not carry it', () => {
    openAt('/create?internal=1');

    applyInternalTrafficMark();

    expect(addressBar()).toBe('/create');
  });

  it('leaves the rest of the address as it was', () => {
    openAt('/create?internal=1&keep=me');

    applyInternalTrafficMark();

    expect(addressBar()).toBe('/create?keep=me');
  });
});

describe('unmarking a browser', () => {
  it('is done as explicitly as marking it, without emptying the storage by hand', () => {
    openAt('/?internal=1');
    applyInternalTrafficMark();

    openAt('/?internal=0');
    applyInternalTrafficMark();

    expect(isInternalTraffic()).toBe(false);
    expect(internalTrafficParams()).toEqual({});
    expect(addressBar()).toBe('/');
  });
});

describe('an address saying something else', () => {
  it('changes nothing and says what the two answers are', () => {
    openAt('/?internal=1');
    applyInternalTrafficMark();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    openAt('/?internal=yes');
    applyInternalTrafficMark();

    expect(isInternalTraffic()).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('internal=1'));
  });
});

describe('a browser whose storage cannot be reached', () => {
  it('reports itself as ordinary traffic instead of throwing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    withUnreachableStorage(() => {
      expect(isInternalTraffic()).toBe(false);
      expect(internalTrafficParams()).toEqual({});
    });

    // Proof the storage really was unreachable, rather than merely empty.
    expect(warn).toHaveBeenCalled();
  });

  it('survives being handed a mark it has nowhere to keep', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    openAt('/?internal=1');

    withUnreachableStorage(() => {
      expect(() => {
        applyInternalTrafficMark();
      }).not.toThrow();
    });

    expect(warn).toHaveBeenCalled();
    // The mark is lost, not the page: the address is still tidied up.
    expect(addressBar()).toBe('/');
    expect(isInternalTraffic()).toBe(false);
  });
});
