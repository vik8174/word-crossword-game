import { describe, expect, it } from 'vitest';

import {
  inRem,
  LOGOTYPE_TRACKING,
  SPACING_STEPS,
  SYSTEM_FONT_FAMILY,
  TEXT_FONT_FAMILY,
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

  it('sets every variant in one of the two weights', () => {
    const weights: unknown[] = [WEIGHTS.regular, WEIGHTS.bold];

    for (const variant of EVERY_VARIANT) {
      expect(weights).toContain(theme.typography[variant].fontWeight);
    }

    // No rule anywhere may land on a weight this family does not ship: 400 and
    // 700 (and the 400 italic) are the only three files fetched, so 300, 500
    // and 600 must never appear as a value here.
    expect(weights).not.toContain(300);
    expect(weights).not.toContain(500);
    expect(weights).not.toContain(600);

    // Anything reaching for bold is given the same bold rather than a third
    // weight nobody chose.
    expect(theme.typography.fontWeightBold).toBe(WEIGHTS.bold);
    expect(theme.typography.fontWeightMedium).toBe(WEIGHTS.bold);
  });
});

describe('the one face', () => {
  it('sets the four headings in the text family, at the bold weight', () => {
    // There is one family (issue #244), so what tells a heading from a
    // paragraph is weight and size alone.
    for (const heading of ['h1', 'h2', 'h3', 'h4'] as const) {
      expect(theme.typography[heading].fontFamily).toBe(TEXT_FONT_FAMILY);
      expect(theme.typography[heading].fontWeight).toBe(WEIGHTS.bold);
    }
  });

  it('is Alegreya Sans everywhere: the text and the heading', () => {
    expect(TEXT_FONT_FAMILY).toMatch(/^"Alegreya Sans"/);
    expect(TEXT_FONT_FAMILY).not.toMatch(/Zen|Dela|Mincho/);
  });

  it('keeps the name of the game’s tracking, its face being the heading’s', () => {
    // Settled on real renders in PRD #145 and kept until the screen is
    // redrawn (#224).
    expect(LOGOTYPE_TRACKING).toBe('0.34em');
  });

  it('sets the text of the interface in the text face, and falls back to the system', () => {
    // Everything read rather than looked at is in this face (issue #124), and
    // it is named once — a variant that says nothing about a family gets it.
    expect(theme.typography.fontFamily).toBe(TEXT_FONT_FAMILY);
    // The system stack is the tail of it rather than a face of its own: it is
    // what a first frame is drawn in, and what is drawn if the file never
    // arrives.
    expect(TEXT_FONT_FAMILY.endsWith(SYSTEM_FONT_FAMILY)).toBe(true);
    expect(SYSTEM_FONT_FAMILY).not.toMatch(/Alegreya/);
  });

  it('sets text in no tracking and no capitals', () => {
    // Nothing is lettered any more except the name of the game on the landing
    // page, which carries its own tracking (`LOGOTYPE_TRACKING`) until its
    // screen is redrawn.
    expect(theme.typography.body1.letterSpacing).toBeUndefined();
    expect(theme.typography.body1.textTransform).toBeUndefined();
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
