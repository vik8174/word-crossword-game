import { describe, expect, it } from 'vitest';

import { eased } from './easing';

/** Where a cubic Bézier with its ends pinned is, along one axis, at its own parameter. */
const alongAxis = (first: number, second: number, t: number): number =>
  3 * (1 - t) * (1 - t) * t * first + 3 * (1 - t) * t * t * second + t * t * t;

/**
 * The curve `eased` is built from, sampled the slow and obvious way.
 *
 * Written out from the same handles `easing.ts` uses, so the two cannot drift
 * apart without this failing — `0.65, 0, 0.35, 1`: smooth away, quickest in
 * the middle, smooth in.
 */
const curveFromTheHandles = (time: number): number => {
  let low = 0;
  let high = 1;

  for (let step = 0; step < 60; step += 1) {
    const middle = (low + high) / 2;

    if (alongAxis(0.65, 0.35, middle) < time) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return alongAxis(0, 1, (low + high) / 2);
};

describe('eased', () => {
  it('starts where it starts and ends where it ends', () => {
    expect(eased(0)).toBe(0);
    expect(eased(1)).toBe(1);
    expect(eased(-0.4)).toBe(0);
    expect(eased(3)).toBe(1);
  });

  it('is the curve its own handles describe', () => {
    for (let step = 0; step <= 20; step += 1) {
      const time = step / 20;

      expect(eased(time), `at ${time}`).toBeCloseTo(curveFromTheHandles(time), 4);
    }
  });

  it('never goes backwards', () => {
    let last = -1;

    for (let step = 0; step <= 100; step += 1) {
      const now = eased(step / 100);

      expect(now).toBeGreaterThanOrEqual(last);
      last = now;
    }
  });

  it('is slowest at both ends and quickest in the middle', () => {
    // The whole of the decision this curve was chosen for: a cloth that closes
    // sharply and then coasts reads as a snap rather than a fabric settling.
    const start = eased(0.1) - eased(0);
    const middle = eased(0.55) - eased(0.45);
    const end = eased(1) - eased(0.9);

    expect(middle).toBeGreaterThan(start * 2);
    expect(middle).toBeGreaterThan(end * 2);
    // Symmetrical, so halfway through the time is halfway through the journey.
    expect(eased(0.5)).toBeCloseTo(0.5, 6);
  });
});
