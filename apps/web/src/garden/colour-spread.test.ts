import { describe, expect, it } from 'vitest';

import { spreadOf } from './colour-spread';
import { SCENE } from './scene-palette';

/**
 * What this file holds the spread to: a ramp nothing has shifted has to come
 * out as the ramp that went in.
 *
 * That is the claim the whole of the depth rests on. Every mass of leaves in
 * the picture is drawn through this, so a spread that quietly rounded a channel
 * would repaint the forest — and the one thing the scene promises is that it is
 * the same forest on every load.
 */

/** `#RRGGBB` as three numbers, so two spellings of one colour compare equal. */
const asRgb = (hex: string): readonly number[] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const RAMP = [SCENE.night, SCENE.deep, SCENE.shade, SCENE.moss] as const;

describe('spreadOf', () => {
  it('gives back the ramp it was given when nothing is shifting it', () => {
    const spread = spreadOf(RAMP);

    expect(spread).toHaveLength(RAMP.length);

    for (const [index, step] of spread.entries()) {
      // One tone, and it is the colour as written: a step nothing has moved is
      // not eight copies of the same string.
      expect(step).toHaveLength(1);
      expect(asRgb(step[0] ?? '')).toEqual(asRgb(RAMP[index] ?? ''));
    }
  });

  it('lays air over a ramp, and lays more of it the further away the plane is', () => {
    const near = spreadOf(RAMP, { towards: SCENE.shade, haze: 0.2 });
    const far = spreadOf(RAMP, { towards: SCENE.shade, haze: 0.8 });
    const air = asRgb(SCENE.shade);

    const away = (spread: ReturnType<typeof spreadOf>): number => {
      const first = asRgb(spread[0]?.[0] ?? '');

      return Math.abs((first[1] ?? 0) - (air[1] ?? 0));
    };

    expect(away(far)).toBeLessThan(away(near));
  });

  it('flattens a ramp towards its own middle as contrast goes out of it', () => {
    const range = (spread: ReturnType<typeof spreadOf>): number => {
      const greens = spread.map((step) => asRgb(step[0] ?? '')[1] ?? 0);

      return Math.max(...greens) - Math.min(...greens);
    };

    expect(range(spreadOf(RAMP, { contrast: 0.3 }))).toBeLessThan(range(spreadOf(RAMP)));
    // Nothing left of the ramp at all: every step is the one tone in the middle.
    expect(range(spreadOf(RAMP, { contrast: 0 }))).toBe(0);
  });

  it('spreads each step into tones once a mass is told its leaves differ', () => {
    const spread = spreadOf(RAMP, { jitter: 0.12 });

    for (const step of spread) {
      expect(step.length).toBeGreaterThan(1);
      expect(new Set(step).size).toBeGreaterThan(1);
    }
  });

  it('builds one spread for one ramp and one shift, however often it is asked', () => {
    // This is the whole point of the file: a mass asks for its colours on every
    // frame of every journey, and building them there is what a browser parses
    // more slowly than it fills the shape they were for.
    const shift = { towards: SCENE.shade, haze: 0.4, contrast: 0.6, jitter: 0.08 };

    expect(spreadOf(RAMP, shift)).toBe(spreadOf(RAMP, shift));
    expect(spreadOf(RAMP, shift)).not.toBe(spreadOf(RAMP, { ...shift, haze: 0.5 }));
  });

  it('gives the same tones on every load, because none of them come from chance', () => {
    expect(spreadOf([SCENE.leaf, SCENE.fresh], { jitter: 0.1 })).toEqual(
      spreadOf([SCENE.leaf, SCENE.fresh], { jitter: 0.1 }),
    );
  });
});
