import { generateCrossword, MAX_WORDS, MIN_WORDS } from 'shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  BOARD_HEIGHT_PERCENT,
  type BoardBox,
  type BoardShape,
  cellSizeIn,
  fitsIn,
  MAX_CELL_SIZE,
  MIN_CELL_SIZE,
} from './board-geometry';

/**
 * Words a game is played with, in the proportions a real list has: most of them
 * five to eight letters, a few very short, a few at the ceiling.
 *
 * Fixed and committed rather than read from a dictionary, so the same run
 * happens on every machine — what is being measured is the shape a list of this
 * kind lays out into, and only the letters matter to that.
 */
// prettier-ignore
const WORD_POOL = [
  'cat', 'dog', 'sun', 'key', 'ice', 'air', 'cup', 'bus',
  'book', 'tree', 'lamp', 'fish', 'road', 'wind', 'gold', 'rain', 'moon', 'ship',
  'apple', 'house', 'water', 'light', 'music', 'plant', 'river', 'cloud',
  'bread', 'chair', 'green', 'storm', 'dance', 'ocean',
  'garden', 'forest', 'orange', 'market', 'silver', 'winter', 'animal', 'bridge',
  'castle', 'flower', 'island', 'monkey', 'pocket', 'summer', 'travel', 'window',
  'bicycle', 'blanket', 'captain', 'diamond', 'evening', 'freedom', 'holiday', 'journey',
  'kitchen', 'library', 'morning', 'picture', 'teacher', 'weather', 'village', 'whisper',
  'airplane', 'birthday', 'computer', 'daughter', 'elephant', 'football', 'hospital',
  'mountain', 'painting', 'sandwich', 'shoulder', 'sunshine', 'triangle', 'umbrella',
  'adventure', 'blackbird', 'breakfast', 'chocolate', 'community', 'education',
  'furniture', 'guitarist', 'lightning', 'telephone',
  'basketball', 'brainstorm', 'friendship', 'generation', 'illustrate', 'playground',
  'strawberry',
  'information', 'mathematics', 'opportunity', 'photography', 'possibility',
  'architecture', 'neighborhood', 'relationship',
  'extraordinary', 'unforgettable',
  'administration',
  'internationally',
  'characterization',
] as const;

/** How many games are laid out for each list size. */
const GAMES_PER_SIZE = 15;

/** How long the games may take to lay out before something is genuinely wrong. */
const MEASUREMENT_TIMEOUT_MS = 60_000;

/**
 * How far the generator's clock moves on every reading, in milliseconds — see
 * {@link layoutsOf}. A fifth of its half-second budget, so a list that needs
 * them gets five draws rather than a number decided by the machine.
 */
const ATTEMPT_CLOCK_STEP_MS = 100;

/**
 * The list sizes played against: the smallest game there can be, a middling
 * one, and the largest.
 *
 * Taken from the validator rather than written down again, so raising the
 * ceiling on a word list is measured here rather than merely allowed.
 */
const LIST_SIZES = [MIN_WORDS, Math.round((MIN_WORDS + MAX_WORDS) / 2), MAX_WORDS];

/**
 * A screen the game is played on, and how much of it the board gets.
 *
 * The width is the page's to give, not the board's: the room sits in a
 * `Container maxWidth="sm"`, which leaves 552 pixels whatever the window is —
 * which is why a desktop and a tablet differ here only in height.
 */
interface Screen {
  readonly name: string;
  /** Height of the window, which the board takes its share of. */
  readonly windowHeight: number;
  /** What the page leaves the board across. */
  readonly boardWidth: number;
  /** The share of games that must fit on it whole, with no scrolling. */
  readonly promise: number;
}

/**
 * Two screens and what the board manages on them today.
 *
 * They differ only in height, because at 552 pixels across it is the width that
 * runs out first — so a tablet's taller screen currently buys it nothing, and
 * its lower promise is met with room to spare. The two come apart the moment
 * the room page gives the board more than a `maxWidth="sm"` column: on the same
 * set of games, a board 880 pixels across fits every one of them on both.
 */
const SCREENS: readonly Screen[] = [
  { name: 'desktop, 1440 by 900', windowHeight: 900, boardWidth: 552, promise: 0.75 },
  { name: 'tablet, 834 by 1112', windowHeight: 1112, boardWidth: 552, promise: 0.6 },
];

const boardBoxOn = ({ windowHeight, boardWidth }: Screen): BoardBox => ({
  width: boardWidth,
  height: (windowHeight * BOARD_HEIGHT_PERCENT) / 100,
});

/** A small deterministic source of randomness — mulberry32. */
const randomFrom = (seed: number) => (): number => {
  seed = (seed + 0x6d2b79f5) | 0;

  let mixed = Math.imul(seed ^ (seed >>> 15), 1 | seed);

  mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;

  return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
};

/** One game's word list: the pool shuffled by its seed, cut to size. */
const wordListOf = (size: number, seed: number): string[] => {
  const next = randomFrom(seed);
  const words: string[] = [...WORD_POOL];

  for (let index = words.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(next() * (index + 1));
    const held = words[index]!;

    words[index] = words[swapWith]!;
    words[swapWith] = held;
  }

  return words.slice(0, size);
};

/**
 * The shapes a list size lays out into — one per game, seeded so that the same
 * grids come out on every run.
 *
 * The generator places words at random, so it is handed a fixed source of
 * randomness rather than the real one: without it this measurement would be a
 * different measurement every time it ran, and a threshold it crossed today
 * would be missed tomorrow for no reason anybody could find.
 *
 * The clock is handed over for the same reason, and it is the less obvious
 * half. The generator builds several grids and keeps the best, but stops
 * starting new ones once half a second has gone on them — so on a slower
 * machine, or under coverage, a list would keep a worse grid than it keeps
 * here, and the share of games that fit would depend on how busy the computer
 * was. A clock that ticks a fixed step per reading spends that budget after a
 * fixed number of attempts instead of after a fixed amount of time, which is
 * the same measurement everywhere. The step is only how many draws a game gets:
 * on this word list every step from one draw to ten produces the very same
 * grids, so it costs nothing but the time it saves.
 */
const layoutsOf = (size: number): BoardShape[] =>
  Array.from({ length: GAMES_PER_SIZE }, (_unused, game) => {
    let clock = 0;

    vi.spyOn(Math, 'random').mockImplementation(randomFrom(size * 1000 + game));
    vi.spyOn(Date, 'now').mockImplementation(() => (clock += ATTEMPT_CLOCK_STEP_MS));

    const { cols, rows } = generateCrossword(wordListOf(size, size * 7919 + game));

    vi.restoreAllMocks();

    return { cols, rows };
  });

/**
 * Every game of the set, laid out once and kept — the same grids answer for
 * every screen, and laying them out again per screen would only cost time.
 */
let games: readonly BoardShape[] | null = null;

const gamesPlayed = (): readonly BoardShape[] => (games ??= LIST_SIZES.flatMap(layoutsOf));

/** The share of those games that fit the box whole. */
const fitRateIn = (box: BoardBox): number =>
  gamesPlayed().filter((shape) => fitsIn(box, shape)).length / gamesPlayed().length;

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * What the release promised about the board, checked against the generator
 * rather than against a stylesheet.
 *
 * The size of a square is worked out during layout, by `clamp()`, `min()` and
 * container units — none of which jsdom computes, so no rendered test could
 * ever see it. What can be checked is the decision underneath: with these
 * bounds, this height budget and this ceiling on a word list, how often does a
 * game fit a screen whole?
 *
 * It therefore fails if the ceiling on a word list is raised, if the board's
 * share of the window is cut, or if a square is no longer allowed to shrink as
 * far — which is what it is here to guard.
 *
 * The margins are thin on purpose and worth knowing before touching any of
 * those numbers. A desktop fits 34 of these 45 games; it fits 33 at 65% of the
 * window instead of 70, 24 if a square may not go below 22 pixels, and 29 if a
 * word list may hold 25 words instead of 20. Every one of those is a red test,
 * and every one of them should be: they are the promise changing, not the code
 * breaking.
 */
describe('the board on a real screen', () => {
  SCREENS.forEach((screen) => {
    it(
      `fits ${Math.round(screen.promise * 100)}% of games whole on a ${screen.name}`,
      () => {
        expect(fitRateIn(boardBoxOn(screen))).toBeGreaterThanOrEqual(screen.promise);
      },
      // Laying 45 crosswords out is real work — a second and a half here, and
      // several times that under coverage, which instruments every line of the
      // generator. The default five seconds is a limit on waiting for
      // something, and nothing here is waiting.
      MEASUREMENT_TIMEOUT_MS,
    );
  });
});

describe('the side of a square', () => {
  it('never goes below the size a letter stays readable at', () => {
    const tiny = cellSizeIn({ width: 200, height: 200 }, { cols: 30, rows: 30 });

    expect(tiny).toBe(MIN_CELL_SIZE);
  });

  it('stops growing before the board becomes a toy', () => {
    const roomy = cellSizeIn({ width: 4000, height: 3000 }, { cols: 12, rows: 10 });

    expect(roomy).toBe(MAX_CELL_SIZE);
  });

  it('is decided by the axis that runs out first, not by the wider one', () => {
    const wideAndLow = { width: 4000, height: 700 };

    expect(cellSizeIn(wideAndLow, { cols: 20, rows: 20 })).toBeCloseTo((700 - 19 * 2) / 20);
  });

  it('is the same for a room whose words have not been dealt out as for one square', () => {
    expect(cellSizeIn({ width: 552, height: 630 }, { cols: 0, rows: 0 })).toBe(MAX_CELL_SIZE);
  });
});

describe('whether a board fits', () => {
  it('says no as soon as the squares would have to shrink past their floor', () => {
    const box = { width: 552, height: 630 };

    expect(fitsIn(box, { cols: 25, rows: 25 })).toBe(true);
    expect(fitsIn(box, { cols: 26, rows: 26 })).toBe(false);
  });
});
