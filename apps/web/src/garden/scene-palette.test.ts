import { describe, expect, it } from 'vitest';

import { SHOJI_PAPER } from './paint-hall';
import { BAND, SCENE, SCENE_INK_DIM, VEIL } from './scene-palette';

/**
 * What this file is for: the garden writes cream on a painting, and a painting
 * is not one colour.
 *
 * The theme measures ink on paper and refuses a palette the board cannot be
 * read from (`theme.test.ts`,
 * `docs/decisions/0015-explained-words-in-the-grid.md`). The scene needs the
 * same guard for the same reason and it is harder to eyeball, because what is
 * behind a line of text here is a forest, a temple wall, a wooden floor or a
 * sheet of lit paper — and only one of those is the difficult one.
 *
 * So the worst case is measured rather than assumed. Every surface a sentence
 * can land on is listed below, and the two inks this place writes in have to
 * clear the contrast small text is owed on all of them.
 */

/** What small text has to reach to be read, and what a heading has to reach. */
const SMALL_TEXT = 4.5;
const LARGE_TEXT = 3;

/** A colour, as the three numbers a contrast is worked out from. */
type Rgb = readonly [number, number, number];

/** `#RRGGBB` as three numbers. */
const asRgb = (hex: string): Rgb => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

/** `rgba(r, g, b, a)` as three numbers and the alpha. */
const asRgba = (colour: string): { readonly rgb: Rgb; readonly alpha: number } => {
  const parts = colour
    .slice(colour.indexOf('(') + 1, colour.indexOf(')'))
    .split(',')
    .map((part) => Number(part.trim()));

  return { rgb: [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0], alpha: parts[3] ?? 1 };
};

/** One colour laid over another at an opacity, as a browser composites them. */
const over = (top: Rgb, alpha: number, bottom: Rgb): Rgb => [
  alpha * top[0] + (1 - alpha) * bottom[0],
  alpha * top[1] + (1 - alpha) * bottom[1],
  alpha * top[2] + (1 - alpha) * bottom[2],
];

/** A channel, undone from the curve a screen applies to it. */
const straightened = (channel: number): number => {
  const share = channel / 255;

  return share <= 0.03928 ? share / 12.92 : Math.pow((share + 0.055) / 1.055, 2.4);
};

/** How much light a colour sends out, as WCAG counts it. */
const lightness = ([red, green, blue]: Rgb): number =>
  0.2126 * straightened(red) + 0.7152 * straightened(green) + 0.0722 * straightened(blue);

/** How far apart two colours are, as WCAG counts it. */
const contrast = (one: Rgb, other: Rgb): number => {
  const [brighter, darker] = [lightness(one) + 0.05, lightness(other) + 0.05].sort(
    (first, second) => second - first,
  );

  return (brighter ?? 1) / (darker ?? 1);
};

/** A surface as the reader sees it: the paint, with the veil over it. */
const veiled = (paint: string): Rgb => {
  const veil = asRgba(VEIL);

  return over(veil.rgb, veil.alpha, asRgb(paint));
};

/** The same surface with a band over it, which is what text stands on. */
const banded = (paint: string): Rgb => {
  const band = asRgba(BAND);

  return over(band.rgb, band.alpha, veiled(paint));
};

/** Cream at the weight a secondary line is written in, over what it lands on. */
const dimOver = (surface: Rgb): Rgb => {
  const ink = asRgba(SCENE_INK_DIM);

  return over(ink.rgb, ink.alpha, surface);
};

/**
 * Every surface a sentence can land on, brightest first.
 *
 * The lit paper of the temple's doors is the whole reason for this list: it is
 * brighter than anything else in the place by a long way, and it is the surface
 * the crossword stands against, so it is the one every claim has to survive.
 */
const SURFACES = [
  { name: 'the lit paper of the doors', paint: SHOJI_PAPER[0] },
  { name: 'the same paper further down', paint: SHOJI_PAPER[2] },
  { name: 'the wall of the hall', paint: SCENE.bark },
  { name: 'the roof of the temple', paint: SCENE.roof },
  { name: 'the near canopy', paint: SCENE.night },
] as const;

describe('what the garden writes on', () => {
  it('reads every sentence off the band, whatever the band is standing on', () => {
    // The band is what a sentence stands on everywhere in this app, and this is
    // why: over the brightest surface in the picture it is still dark enough to
    // read cream off, and the picture goes on showing through it.
    for (const surface of SURFACES) {
      const behind = banded(surface.paint);

      expect(contrast(asRgb(SCENE.cream), behind), `cream on ${surface.name}`).toBeGreaterThan(
        SMALL_TEXT,
      );
      expect(contrast(dimOver(behind), behind), `dim ink on ${surface.name}`).toBeGreaterThan(
        SMALL_TEXT,
      );
    }
  });

  it('reads the name of a step off the picture itself, which has no band under it', () => {
    // The ticket allows no band behind a step title (issue #115), so the scene
    // has to be dark wherever one is put — which is what the walls of the hall
    // and the leaves hanging into the corners of every frame are for.
    for (const paint of [SCENE.bark, SCENE.barkDeep, SCENE.night, SCENE.deep]) {
      expect(contrast(asRgb(SCENE.cream), veiled(paint)), paint).toBeGreaterThan(SMALL_TEXT);
    }
  });

  it('says plainly that lit paper is not something to write on unbanded', () => {
    // Recorded rather than left to be rediscovered: this is the measurement the
    // hall was resized around, and a future release that grows the paper back
    // over the whole window will fail here rather than in somebody's eyes.
    expect(contrast(asRgb(SCENE.cream), veiled(SHOJI_PAPER[0]))).toBeLessThan(LARGE_TEXT);
  });
});
