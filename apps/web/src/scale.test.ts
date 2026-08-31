import { describe, expect, it } from 'vitest';

import {
  DISPLAY_FONT_FAMILY,
  inRem,
  SIGN_FONT_FAMILY,
  SIGN_FONT_WEIGHT,
  SPACING_STEPS,
  SYSTEM_FONT_FAMILY,
  TEXT_LEVELS,
  WEIGHTS,
} from './scale';
import { theme } from './theme';

/** Every variant MUI ships, so none of them can be left at a size of its own. */
const EVERY_VARIANT = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'subtitle1',
  'subtitle2',
  'body1',
  'body2',
  'button',
  'caption',
  'overline',
  'signage',
] as const;

describe('the scale', () => {
  it('is four levels a third apart, and the numbers follow from that', () => {
    // The ratio is the thing worth arguing with; the sizes are worked out from
    // it, so they cannot drift away from it by being edited one at a time.
    expect(Object.values(TEXT_LEVELS)).toEqual([31, 23, 17, 13]);
  });

  it('asks for a level as a share of the reader’s own text size', () => {
    // Somebody who has made text larger in their browser has said something,
    // and a size in pixels ignores it.
    expect(inRem(TEXT_LEVELS.body)).toBe('1.0625rem');
    expect(inRem(TEXT_LEVELS.aside)).toBe('0.8125rem');
  });

  it('sets every variant MUI ships on one of the four levels', () => {
    // The app used seven sizes for four screens, two of which — `body1` and
    // `subtitle1` — were the same sixteen pixels under different names. A
    // variant left unsaid here would be MUI's own size and so an eighth.
    const levels = Object.values(TEXT_LEVELS).map(inRem);

    for (const variant of EVERY_VARIANT) {
      expect(levels).toContain(theme.typography[variant].fontSize);
    }
  });

  it('sets every variant in one of the two weights, or in the sign face’s own', () => {
    const weights: unknown[] = [WEIGHTS.regular, WEIGHTS.semibold, SIGN_FONT_WEIGHT];

    for (const variant of EVERY_VARIANT) {
      expect(weights).toContain(theme.typography[variant].fontWeight);
    }

    // Anything reaching for bold is given the semibold rather than a third
    // weight nobody chose.
    expect(theme.typography.fontWeightBold).toBe(WEIGHTS.semibold);
    expect(theme.typography.fontWeightMedium).toBe(WEIGHTS.semibold);
  });
});

describe('the three faces', () => {
  it('keeps the display face on the two large levels and off everything smaller', () => {
    // It is a latin face at one weight, and at thirteen or seventeen pixels it
    // is read more slowly than whatever the reader's own system would draw.
    for (const heading of ['h1', 'h2', 'h3', 'h4'] as const) {
      expect(theme.typography[heading].fontFamily).toBe(DISPLAY_FONT_FAMILY);
    }

    for (const text of ['h5', 'h6', 'subtitle1', 'subtitle2', 'body1', 'body2'] as const) {
      expect(theme.typography[text].fontFamily ?? SYSTEM_FONT_FAMILY).not.toMatch(/Zen Old Mincho/);
    }
  });

  it('declares the sign face in the theme, so the garden does not declare one', () => {
    // The scene of issue #115 paints its words onto a canvas, where there is no
    // variant to reach for. It reads the face from here instead of naming a
    // font of its own that nothing else in the app could be held to.
    expect(theme.typography.signage.fontFamily).toBe(SIGN_FONT_FAMILY);
    expect(theme.typography.signage.fontWeight).toBe(SIGN_FONT_WEIGHT);
    // Lettering rather than text: capitals, held apart.
    expect(theme.typography.signage.textTransform).toBe('uppercase');
    expect(theme.typography.signage.letterSpacing).toBeDefined();
  });

  it('fetches nothing for the text of the interface', () => {
    // The landing page is drawn the moment its HTML lands, so nothing a visitor
    // reads first is waiting on a font.
    expect(theme.typography.fontFamily).toBe(SYSTEM_FONT_FAMILY);
    expect(SYSTEM_FONT_FAMILY).not.toMatch(/Zen/);
  });
});

describe('the row of gaps', () => {
  it('is the seven steps and nothing between them', () => {
    expect(SPACING_STEPS).toEqual([0, 4, 8, 12, 16, 24, 32, 48]);
  });

  it('is what every spacing prop in the app resolves against', () => {
    // Read as an index rather than as a multiplier: `mt: 5` is the fifth step.
    expect(theme.spacing(1)).toBe('4px');
    expect(theme.spacing(5)).toBe('24px');
    expect(theme.spacing(7)).toBe('48px');
  });
});
