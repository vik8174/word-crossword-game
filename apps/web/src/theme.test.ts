import { describe, expect, it } from 'vitest';
import { theme } from './theme';

/** A colour as the three channels a screen draws it with, and how solid it is. */
interface Channels {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly opacity: number;
}

/**
 * A colour of the theme, read into channels.
 *
 * The palette is written in hex, and what is derived from it comes back out of
 * MUI as `rgb()` or `rgba()` — a token thinned with `alpha()` is one of those.
 * Both forms are read here, so no test has to know which of them a particular
 * entry happened to end up as.
 */
const channelsOf = (colour: string): Channels => {
  if (colour.startsWith('#')) {
    return {
      red: parseInt(colour.slice(1, 3), 16),
      green: parseInt(colour.slice(3, 5), 16),
      blue: parseInt(colour.slice(5, 7), 16),
      opacity: 1,
    };
  }

  const inside = colour.slice(colour.indexOf('(') + 1, colour.lastIndexOf(')'));
  const [red = NaN, green = NaN, blue = NaN, opacity = 1] = inside
    .split(',')
    .map((part) => Number(part.trim()));

  if (Number.isNaN(red + green + blue)) {
    throw new Error(`Not a colour this test can read: ${colour}`);
  }

  return { red, green, blue, opacity };
};

/**
 * Relative luminance, as WCAG defines it — and as it comes out on this page.
 *
 * Several of what the board is drawn with are ink thinned down, which means
 * nothing on its own: laid over one thing it is one colour and over another it
 * is a different one. The page is what they are actually laid over, so that is
 * what they are read against.
 */
const luminanceOf = (colour: string): number => {
  const { red, green, blue, opacity } = channelsOf(colour);
  const page = channelsOf(theme.palette.background.default);
  const linear = (channel: number, under: number): number => {
    const value = (channel * opacity + under * (1 - opacity)) / 255;

    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };

  return (
    0.2126 * linear(red, page.red) +
    0.7152 * linear(green, page.green) +
    0.0722 * linear(blue, page.blue)
  );
};

/** How far apart two colours are as text and its background, 1:1 to 21:1. */
const contrastBetween = (one: string, other: string): number => {
  const [lighter, darker] = [luminanceOf(one), luminanceOf(other)];

  return (Math.max(lighter, darker) + 0.05) / (Math.min(lighter, darker) + 0.05);
};

/**
 * How light a colour looks, 0 to 100 — which is what a screen read with the
 * colour taken out of it is left with.
 *
 * Luminance on its own will not do for this: it is linear, and two surfaces
 * three hundredths apart down at the paper end of it are the same surface to
 * look at. CIE lightness is the scale the eye is actually on.
 */
const lightnessOf = (colour: string): number => {
  const luminance = luminanceOf(colour);

  return luminance > 216 / 24389 ? 116 * Math.cbrt(luminance) - 16 : (luminance * 24389) / 27;
};

/** How far apart two colours are once the colour is taken out of them. */
const greyscaleGapBetween = (one: string, other: string): number =>
  Math.abs(lightnessOf(one) - lightnessOf(other));

/**
 * The smallest difference in lightness this app calls a difference.
 *
 * Taken from what the palette actually came out at rather than from a standard,
 * there being none for two fills of the same shape: the four states of a square
 * are between four and fourteen points apart, so anything under four is a
 * palette that has been edited into a state it can no longer say.
 */
const A_VISIBLE_DIFFERENCE = 4;

describe('theme', () => {
  it('has one scheme, and it is the light one', () => {
    // It is declared as a colour scheme rather than as a bare palette (see
    // `theme.ts`), which is what a dark one being added later costs nothing but
    // a second object. There is no dark one in this release.
    expect(theme.palette.mode).toBe('light');
  });

  it('reads ink on paper', () => {
    // The one figure everything else on the page rests on: body text, the
    // letters of the crossword, and the numbers printed in its corners are all
    // sumi, and all of them are on washi.
    expect(
      contrastBetween(theme.palette.sumi.main, theme.palette.washi.main),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastBetween(theme.palette.text.primary, theme.palette.background.default),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastBetween(theme.palette.text.secondary, theme.palette.background.default),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps every accent readable, both as writing and as something written on', () => {
    const roles = [
      theme.palette.primary,
      theme.palette.secondary,
      theme.palette.error,
      theme.palette.warning,
      theme.palette.info,
      theme.palette.success,
    ];

    for (const role of roles) {
      // As a word on the page — an outlined button, a line saying the link was
      // copied — and as the ground a word inside it is written on.
      expect(contrastBetween(role.main, theme.palette.background.default)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(contrastBetween(role.contrastText, role.main)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('tells the four states of a square apart with the colour taken out', () => {
    // Empty, mine, the ones I explain, the ones the group answered. A player
    // who reads a word they are explaining as one already answered stops
    // explaining it, and the game stalls with both of them waiting
    // (`docs/decisions/0015-explained-words-in-the-grid.md`), so this cannot be
    // left to hue: the squares carry a dashed outline and a slanted letter as
    // well, and the surfaces under them stand apart on their own.
    const { empty, own, explained, guessed } = theme.palette.grid;
    const states = { empty, own, explained, guessed };
    const names = Object.keys(states) as (keyof typeof states)[];

    for (const one of names) {
      for (const other of names.filter((name) => name !== one)) {
        expect(greyscaleGapBetween(states[one], states[other])).toBeGreaterThanOrEqual(
          A_VISIBLE_DIFFERENCE,
        );
      }
    }
  });

  it("does not let a square of the player's own be read as a refused answer", () => {
    // The trap this palette was built around. Both are tinted squares of the
    // same board and one of them means the answer has already been thrown out,
    // so they part company in lightness rather than only in hue — a player who
    // read one as the other would go on believing a word the room had refused.
    expect(
      greyscaleGapBetween(theme.palette.grid.own, theme.palette.grid.refused),
    ).toBeGreaterThanOrEqual(A_VISIBLE_DIFFERENCE);
    expect(
      greyscaleGapBetween(theme.palette.grid.ownFilling, theme.palette.grid.refused),
    ).toBeGreaterThanOrEqual(A_VISIBLE_DIFFERENCE);
    // And their outlines with them, since a refused square keeps the shape of
    // the one it replaced and swaps only what it is drawn in.
    expect(
      greyscaleGapBetween(theme.palette.secondary.main, theme.palette.error.dark),
    ).toBeGreaterThanOrEqual(A_VISIBLE_DIFFERENCE);
  });

  it('rules the board in a line that can be seen on the paper it is on', () => {
    // Not a text figure — nothing is written in it — but a grid whose lines
    // cannot be made out is not a crossword.
    expect(
      contrastBetween(theme.palette.grid.rule, theme.palette.grid.empty),
    ).toBeGreaterThanOrEqual(3);
  });

  it('has one source of truth for a colour: the roles point at the tokens', () => {
    // Sakura is the room and matcha is the board, which is the split that keeps
    // pink off the squares. Anything that let a role drift onto a value of its
    // own would be a second palette nobody had measured.
    expect(theme.palette.primary.main).toBe(theme.palette.sakura.main);
    expect(theme.palette.secondary.main).toBe(theme.palette.matcha.main);
    expect(theme.palette.background.default).toBe(theme.palette.washi.main);
    expect(theme.palette.background.paper).toBe(theme.palette.washi.light);
    expect(theme.palette.text.primary).toBe(theme.palette.sumi.main);
  });

  it('keeps sakura off the board', () => {
    // The decision this ticket turns on, asserted rather than remembered: the
    // squares are paper, ink and the one green accent, and the accent of the
    // room around them appears in none of them.
    const surfaces = Object.values(theme.palette.grid);

    expect(surfaces).not.toContain(theme.palette.sakura.light);
    expect(surfaces).not.toContain(theme.palette.sakura.main);
    expect(surfaces).not.toContain(theme.palette.sakura.dark);
  });

  it('draws the interface in the system font and fetches one face for the crossword', () => {
    // Nothing is fetched for the interface, so the landing page is drawn the
    // moment its HTML lands. The face that is fetched is declared in
    // `index.html`, latin only, at one weight — so every heading using it names
    // that weight rather than being handed an imitation of a bolder one.
    expect(theme.typography.fontFamily).not.toMatch(/Zen Old Mincho/);
    expect(theme.typography.fontFamily).toMatch(/system|apple|sans-serif/i);

    for (const heading of [
      theme.typography.h1,
      theme.typography.h2,
      theme.typography.h3,
      theme.typography.h4,
    ]) {
      expect(heading.fontFamily).toMatch(/Zen Old Mincho/);
      expect(heading.fontWeight).toBe(400);
    }
  });
});
