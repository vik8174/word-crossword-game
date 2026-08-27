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
  WIDE_BOARD_HEIGHT_PERCENT,
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
 * Both of the board's sides are the room's layout to give, and neither of them
 * can be worked out here: they are the answer of a `clamp()` over the window
 * inside a grid of three zones, which jsdom cannot lay out. So they are measured
 * in a browser and written down, and {@link SCREENS} says how.
 */
interface Screen {
  readonly name: string;
  /** Height of the window, which the board takes its share of. */
  readonly windowHeight: number;
  /** What the layout leaves the board across, measured in a real browser. */
  readonly boardWidth: number;
  /** Which of the two height budgets this screen's layout gives the board. */
  readonly heightPercent: number;
  /**
   * The share of games that must fit on it whole, with no scrolling.
   *
   * What the release undertakes to deliver on that screen, rather than what the
   * code happens to manage. Both figures are met with room to spare and are
   * meant to be: the promise is the floor the board may not fall back through,
   * not a record of what it reaches.
   */
  readonly promise: number;
}

/**
 * Two screens and what the board manages on them.
 *
 * They differ in both directions now, which is issue #101's doing. Until it the
 * room sat in a `Container maxWidth="sm"` and the board had 552 pixels across
 * whatever the window was, so a tablet's taller screen bought it nothing: at
 * that width it was the width that ran out first on every screen, and a desktop
 * fitted 34 of these 45 games. The room takes the whole window now, with the
 * board in the middle of it, and the widths below were read off the board's own
 * box in Chrome — 915 pixels in a 1440 by 900 window, where the two indexes
 * stand either side of it, and 802 in a 834 by 1112 one, where they stand
 * underneath and the board has the width to itself.
 *
 * The height each of them gives the board differs for the same reason, and the
 * one that matters is the desktop's: a crossword comes out nearly square, so
 * once the width stops being the binding side it is the height that decides
 * whether a game fits.
 *
 * The desktop's promise is 0.8, which is what the release undertook and what
 * issue #100 could not reach from inside this module at any setting of the
 * bounds or of the height budget, because the width was not the board's to
 * give. It is a floor with a great deal under it: at 915 by 702 every one of
 * these 45 games fits whole, and it takes the board back to about 660 pixels
 * across before 0.8 is in danger.
 */
const SCREENS: readonly Screen[] = [
  {
    name: 'desktop, 1440 by 900',
    windowHeight: 900,
    boardWidth: 915,
    heightPercent: WIDE_BOARD_HEIGHT_PERCENT,
    promise: 0.8,
  },
  {
    name: 'tablet, 834 by 1112',
    windowHeight: 1112,
    boardWidth: 802,
    heightPercent: BOARD_HEIGHT_PERCENT,
    promise: 0.6,
  },
];

const boardBoxOn = ({ windowHeight, boardWidth, heightPercent }: Screen): BoardBox => ({
  width: boardWidth,
  height: (windowHeight * heightPercent) / 100,
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
 * far — which is what it is here to guard. It also fails if the layout gives the
 * board less room, but only once somebody measures the new width and writes it
 * into {@link SCREENS}: no test can read that off a stylesheet, and a layout
 * change that is not measured is a promise nobody checked.
 *
 * What the margins are, since they decide how much of the above is a warning
 * and how much is a wall. A desktop fits all 45 of these games at 915 by 702,
 * and it goes on fitting all of them down to about 660 pixels across; the
 * promise of 0.8 breaks somewhere under 570. A square that may not go below 22
 * pixels rather than 20 costs neither screen anything at these sizes, which it
 * did cost when the board had 552 pixels. A larger word list would change the
 * games being measured rather than the room they are measured in, and is the
 * change this test exists to make somebody look at. Every one of those failing
 * is the promise changing rather than the code breaking.
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
