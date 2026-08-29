import { describe, expect, it } from 'vitest';

import {
  driftPetals,
  fillSky,
  GREETING_SECONDS,
  type Petal,
  petalsWanted,
  seedPetal,
  seedSky,
  type Sky,
} from './petals';

const SKY: Sky = { width: 1440, height: 900 };

/** Randomness that is not random, so a sky can be asserted on. */
const always = (value: number) => () => value;

/**
 * A petal with everything about it stated, so a test says what it is testing.
 *
 * @param petal - Whatever this test cares about
 * @returns A petal that is still where it was put unless the test moved it
 */
const petalAt = (petal: Partial<Petal>): Petal => ({
  x: 100,
  y: 100,
  fall: 60,
  sway: 0,
  phase: 0,
  spin: 0,
  angle: 0,
  size: 6,
  ink: 0.3,
  ...petal,
});

describe('petalsWanted', () => {
  it('holds a background when no game has just been finished', () => {
    expect(petalsWanted(SKY, null)).toBeGreaterThan(0);
  });

  it('starts a greeting far thicker than the background it settles into', () => {
    expect(petalsWanted(SKY, 0)).toBeGreaterThan(petalsWanted(SKY, null) * 3);
  });

  it('thins the greeting out as it goes on', () => {
    expect(petalsWanted(SKY, 1)).toBeLessThan(petalsWanted(SKY, 0));
    expect(petalsWanted(SKY, 4)).toBeLessThan(petalsWanted(SKY, 1));
  });

  it('is the background again once the greeting is over, and stays there', () => {
    expect(petalsWanted(SKY, GREETING_SECONDS)).toBe(petalsWanted(SKY, null));
    expect(petalsWanted(SKY, GREETING_SECONDS * 100)).toBe(petalsWanted(SKY, null));
  });

  it('gives a bigger sky more petals, so a phone is not under a blizzard', () => {
    const phone = petalsWanted({ width: 390, height: 780 }, null);
    const desktop = petalsWanted({ width: 2560, height: 1400 }, null);

    expect(phone).toBeLessThan(desktop);
  });

  it('stops counting up on a sky nobody has, and stops counting down on a sliver', () => {
    const huge = petalsWanted({ width: 8000, height: 4000 }, null);
    const huger = petalsWanted({ width: 16000, height: 8000 }, null);
    const sliver = petalsWanted({ width: 200, height: 120 }, null);

    expect(huger).toBe(huge);
    expect(sliver).toBeGreaterThan(0);
  });
});

describe('fillSky', () => {
  it('spreads the first sky through itself rather than dropping it in from above', () => {
    const petals = fillSky(SKY, always(0.5));

    expect(petals).toHaveLength(petalsWanted(SKY, null));
    expect(petals.some((petal) => petal.y > 0)).toBe(true);
    expect(petals.every((petal) => petal.y <= SKY.height)).toBe(true);
  });
});

describe('seedSky', () => {
  it('tops a sky up to what was asked for, without letting it in over the top edge', () => {
    const petals = seedSky(fillSky(SKY, always(0.5)), SKY, 90, always(0.7));

    expect(petals).toHaveLength(90);
    expect(petals.some((petal) => petal.y > SKY.height / 2)).toBe(true);
  });

  it('leaves a sky that is already thick enough alone', () => {
    const thick = fillSky(SKY, always(0.5));

    expect(seedSky(thick, SKY, 1, always(0.5))).toHaveLength(thick.length);
  });
});

describe('seedPetal', () => {
  it('drops a petal in from over the top edge when that is what was asked for', () => {
    expect(seedPetal(always(0.5), SKY, 'above').y).toBeLessThan(0);
  });
});

describe('driftPetals', () => {
  const still = (petals: readonly Petal[], seconds: number, wanted: number) =>
    driftPetals(petals, seconds, SKY, wanted, always(0.5));

  /**
   * The one petal a sky was left holding.
   *
   * @param petals - The sky
   * @returns Its only petal
   * @throws When the sky turned out to hold none, which is the test's answer
   */
  const only = (petals: readonly Petal[]): Petal => {
    const [petal] = petals;

    if (petal === undefined) {
      throw new Error('the sky was expected to hold one petal and held none');
    }

    return petal;
  };

  it('drops a petal down the sky', () => {
    const petal = only(still([petalAt({ y: 100, fall: 60 })], 1, 1));

    expect(petal.y).toBeCloseTo(160);
  });

  it('turns a petal as it falls', () => {
    const petal = only(still([petalAt({ angle: 0, spin: 1 })], 1, 1));

    expect(petal.angle).toBeCloseTo(1);
  });

  it('wanders a petal sideways rather than dropping it down a line', () => {
    const petal = only(still([petalAt({ x: 700, sway: 20, phase: Math.PI / 2 })], 1, 1));

    expect(petal.x).not.toBeCloseTo(700);
  });

  it('brings a petal blown off one edge back in at the other', () => {
    const petal = only(still([petalAt({ x: 1, sway: 100, phase: -Math.PI / 2 })], 1, 1));

    expect(petal.x).toBeGreaterThan(SKY.width / 2);
  });

  it('brings one blown off the far edge back the other way', () => {
    const petal = only(still([petalAt({ x: SKY.width - 1, sway: 100, phase: Math.PI / 2 })], 1, 1));

    expect(petal.x).toBeLessThan(SKY.width / 2);
  });

  it('takes a petal that reached the floor out of the sky', () => {
    const petals = still([petalAt({ y: SKY.height, fall: 60 })], 1, 0);

    expect(petals).toHaveLength(0);
  });

  it('tops the sky back up to what is wanted, from above the top edge', () => {
    const petals = still([], 1 / 60, 5);

    expect(petals).toHaveLength(5);
    expect(petals.every((petal) => petal.y < 0)).toBe(true);
  });

  it('lets a sky thicker than what is wanted thin out by falling, not by vanishing', () => {
    const thick = fillSky(SKY, always(0.5));
    const thinning = still(thick, 1 / 60, 1);

    // Nothing was taken off the screen: a petal leaves when it reaches the
    // floor and not a moment before, which is what makes the greeting fade
    // rather than switch off.
    expect(thinning).toHaveLength(thick.length);
  });

  it('does not put a petal back once the sky is over its number', () => {
    const petals = still([petalAt({ y: SKY.height, fall: 60 }), petalAt({})], 1, 1);

    expect(petals).toHaveLength(1);
  });
});
