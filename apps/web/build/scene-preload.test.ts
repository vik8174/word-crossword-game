import { describe, expect, it } from 'vitest';

import { scenePreloadScript } from './scene-preload';

describe('scenePreloadScript', () => {
  it('is empty when there is nothing to preload', () => {
    expect(scenePreloadScript([])).toBe('');
  });

  it('preloads the picture only on the address it belongs to', () => {
    const script = scenePreloadScript([
      { path: '/', href: '/scenes/gate.avif', type: 'image/avif' },
    ]);

    // A `document.head.appendChild` in the source is how this reads as
    // "ran", since jsdom has no network to actually watch a preload go out
    // on. What matters is that it is guarded by the address rather than
    // written unconditionally.
    expect(script).toContain('location.pathname===p');
    expect(script).toContain('/scenes/gate.avif');
    expect(script).toContain('image/avif');
    expect(script).toContain('document.head.appendChild');
  });

  it('matches an address exactly rather than as a prefix', () => {
    // Every address starts with '/', so `/` cannot be matched the way
    // `route-preload.ts` matches `/room/` — that would preload the gate's
    // picture on every address instead of the one it is drawn on.
    expect(
      scenePreloadScript([{ path: '/', href: '/scenes/gate.avif', type: 'image/avif' }]),
    ).not.toContain('startsWith');
  });

  it('keeps more than one scene apart', () => {
    const script = scenePreloadScript([
      { path: '/', href: '/scenes/gate.avif', type: 'image/avif' },
      { path: '/lobby', href: '/scenes/doors.avif', type: 'image/avif' },
    ]);

    expect(script).toContain('/scenes/gate.avif');
    expect(script).toContain('/scenes/doors.avif');
  });
});
