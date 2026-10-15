import { generateCrossword, MAX_WORDS, MIN_WORDS } from 'shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  APP_SHELL_BOARD_HEIGHT_CSS,
  BAND_MIN_CELL_SIZE,
  BAND_NOTE_GAP,
  bandIsShown,
  boardBoxIn,
  boardHeightsFor,
  BOARD_HEIGHT_CSS,
  BOARD_HEIGHT_PERCENT,
  type BoardBox,
  type BoardShape,
  CELL_GAP,
  cellSizeIn,
  fitsIn,
  MAX_CELL_SIZE,
  MIN_CELL_SIZE,
  NARROW_BOARD_HEIGHT_CSS,
  WIDE_BOARD_HEIGHT_CSS,
  WIDE_BOARD_HEIGHT_PERCENT,
} from './board-geometry';
import { FRAME_HEADER_FALLBACK } from './frame-height';
import { middleWidthAt } from './room-layout';

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
 * underneath and the board has the width to itself. Issue #228 gave the zones
 * the template's 290 and 40 and the sides 48 and 32, which leaves 684 and 770.
 *
 * The height each of them gives the board differs for the same reason, and the
 * one that matters is the desktop's: a crossword comes out nearly square, so
 * once the width stops being the binding side it is the height that decides
 * whether a game fits.
 *
 * The desktop's promise is 0.8, which is what the release undertook and what
 * issue #100 could not reach from inside this module at any setting of the
 * bounds or of the height budget, because the width was not the board's to
 * give. It is a floor with a great deal under it: at 915 by 638 (702 before issue #245's frame) every one of
 * these 45 games fits whole, and it takes the board back to about 660 pixels
 * across before 0.8 is in danger.
 */
const SCREENS: readonly Screen[] = [
  {
    name: 'desktop, 1440 by 900',
    windowHeight: 900,
    boardWidth: middleWidthAt(1440),
    heightPercent: WIDE_BOARD_HEIGHT_PERCENT,
    promise: 0.8,
  },
  {
    name: 'tablet, 834 by 1112',
    windowHeight: 1112,
    boardWidth: 834 - 2 * 32,
    heightPercent: BOARD_HEIGHT_PERCENT,
    promise: 0.6,
  },
];

/**
 * The box the board is drawn into on a screen: its share of the window less the
 * frame's header, which both of these screens have, because the room is one
 * window on both (issue #245). The header is 64px (`frame-height.ts`'s
 * fallback, and the template's `min-height`), so the budgets are 638 and 625.4
 * where they were 702 and 689.4. The share is on the board's own box, whose
 * width the header does not change.
 */
const boardBoxOn = ({ windowHeight, boardWidth, heightPercent }: Screen): BoardBox => ({
  width: boardWidth,
  height: (windowHeight * heightPercent) / 100 - FRAME_HEADER_FALLBACK,
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
 * and how much is a wall. A desktop fits all 45 of these games at 915 by 638 (702 before issue #245's frame, with the same rate),
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

/**
 * Which boards leave room for the frame's header (issue #245).
 *
 * Where the room is one window, from 768 by 600 up, the header is part of that
 * window and the board takes its share of what the header leaves. On a phone the
 * room is a page that scrolls and the header only adds to the page, so the board
 * keeps its share of the whole window, and no board scrolls inside a scrolling
 * page (ADR 0029). The stylesheet is the only place this can be held: jsdom
 * lays nothing out.
 */
describe('the board and the frame’s header', () => {
  it('keeps 62% of the whole window on a phone, whatever the header is', () => {
    expect(BOARD_HEIGHT_CSS).toBe(
      `min(${BOARD_HEIGHT_PERCENT}dvh, calc(var(--board-rows) * ${MAX_CELL_SIZE + CELL_GAP}px - ${CELL_GAP}px))`,
    );
    expect(BOARD_HEIGHT_CSS).not.toContain('--frame-header-height');
  });

  it('takes its share of what the header leaves wherever the room is one window', () => {
    expect(APP_SHELL_BOARD_HEIGHT_CSS).toContain(
      `calc(${BOARD_HEIGHT_PERCENT}dvh - var(--frame-header-height, 64px))`,
    );
    expect(WIDE_BOARD_HEIGHT_CSS).toContain(
      `calc(${WIDE_BOARD_HEIGHT_PERCENT}dvh - var(--frame-header-height, 64px))`,
    );
  });
});

describe('the band above the board', () => {
  /** The ten-word list of `docs/manual-checks.md`: roughly 14 squares by 11. */
  const SHORT_LIST: BoardShape = { cols: 14, rows: 11 };
  /** A board of the drawing's six words. */
  const DRAWING: BoardShape = { cols: 9, rows: 7 };

  it('is never shown under 1200 wide, however small the board is', () => {
    expect(bandIsShown({ width: 1199, height: 1400 }, { cols: 5, rows: 5 })).toBe(false);
    expect(bandIsShown({ width: 834, height: 1112 }, DRAWING)).toBe(false);
    expect(bandIsShown({ width: 375, height: 812 }, DRAWING)).toBe(false);
  });

  it('is never shown in a window too short to be an application', () => {
    expect(bandIsShown({ width: 1440, height: 599 }, { cols: 5, rows: 5 })).toBe(false);
  });

  it('is shown where the board it leaves still has squares of 36px and up', () => {
    expect(bandIsShown({ width: 1440, height: 900 }, DRAWING)).toBe(true);
  });

  it('is left out for the short reference list at 1440 by 900, which it would shrink below 36px', () => {
    // 638 for the board less the band's 241.5 and the 18 under it leaves 378.5,
    // and eleven rows of that are squares of about 32.6.
    expect(bandIsShown({ width: 1440, height: 900 }, SHORT_LIST)).toBe(false);
    expect(
      cellSizeIn({ width: 684, height: 0.78 * 900 - 64 - (684 * (226 / 640) + 18) }, SHORT_LIST),
    ).toBeLessThan(BAND_MIN_CELL_SIZE);
  });

  it(
    'decides every 10- and 20-word board at 1440 by 900 by the squares it would leave',
    () => {
      // The lists the app accepts are 10 to 20 words. At 1440 by 900 the band
      // leaves the board 378.5px of height and 684 of width, and a square of 36px
      // needs 38 per row and 38 per column less the last gap: ten rows and
      // eighteen columns are the most that still get one.
      const decide = ({ rows, cols }: BoardShape) => rows <= 10 && cols <= 18;

      for (const shape of layoutsOf(MIN_WORDS)) {
        expect(bandIsShown({ width: 1440, height: 900 }, shape)).toBe(decide(shape));
      }

      for (const shape of layoutsOf(MAX_WORDS)) {
        expect(bandIsShown({ width: 1440, height: 900 }, shape)).toBe(false);
      }
    },
    MEASUREMENT_TIMEOUT_MS,
  );

  it('turns on at the first height where the squares it leaves are 36px, and not a pixel before', () => {
    const bandAt = 684 * (226 / 640) + 18;
    const squareAt = (height: number) =>
      cellSizeIn({ width: 684, height: 0.78 * height - 64 - bandAt }, SHORT_LIST);
    let height = 600;

    while (!bandIsShown({ width: 1440, height }, SHORT_LIST) && height < 4000) {
      height += 1;
    }

    expect(squareAt(height)).toBeGreaterThanOrEqual(BAND_MIN_CELL_SIZE);
    expect(squareAt(height - 1)).toBeLessThan(BAND_MIN_CELL_SIZE);
  });

  it('leaves a board that is too wide for the window out whatever the height is', () => {
    // At 1200 the middle zone is 444 wide: fourteen columns cannot be 36px there.
    expect(bandIsShown({ width: 1200, height: 4000 }, SHORT_LIST)).toBe(false);
  });
});

describe('the board under the band on the endings', () => {
  /** The drawing's `size=few` board: six words on 9 by 7. */
  const FEW_BOARD: BoardShape = { cols: 9, rows: 7 };
  /** The drawing's `size=many` board: eight words on 11 by 11. */
  const MANY_BOARD: BoardShape = { cols: 11, rows: 11 };
  const WIDE = { width: 1440, height: 900 };
  const PHONE = { width: 375, height: 812 };

  it('leaves a board with nothing above it exactly as it was', () => {
    expect(boardHeightsFor('none')).toEqual({
      phone: BOARD_HEIGHT_CSS,
      narrow: NARROW_BOARD_HEIGHT_CSS,
      appShell: APP_SHELL_BOARD_HEIGHT_CSS,
      tablet: expect.stringContaining(APP_SHELL_BOARD_HEIGHT_CSS),
      wide: WIDE_BOARD_HEIGHT_CSS,
    });
  });

  it('takes the band off the board from a tablet up and never on a phone', () => {
    const heights = boardHeightsFor('band');

    // A phone is a page that scrolls: the drawing costs the board nothing there.
    expect(heights.phone).toBe(BOARD_HEIGHT_CSS);
    expect(heights.narrow).toBe(NARROW_BOARD_HEIGHT_CSS);
    expect(heights.appShell).toContain('100cqw * 226 / 640 + 18px');
    expect(heights.wide).toContain('100cqw * 226 / 640 + 18px');
  });

  it('takes the line under the band off as well on Ended early', () => {
    expect(boardHeightsFor('band-with-note').wide).toContain(
      `100cqw * 226 / 640 + ${BAND_NOTE_GAP}px`,
    );
  });

  it('gives the eight-word board squares of 32.6px at 1440 by 900, under the band', () => {
    // 78% of the 900 less the 64 of the header is 638, the band is 684 × 226/640
    // = 241.5 and 18 under it, which leaves 378.5. The drawing's own square is
    // 32 here.
    const box = boardBoxIn(WIDE, MANY_BOARD, 'band');

    expect(box.width).toBe(684);
    expect(box.height).toBeCloseTo(378.5, 1);
    expect(cellSizeIn(box, MANY_BOARD)).toBeCloseTo(32.6, 1);
  });

  it('lets the six-word board stay at its largest square at 1440 by 900', () => {
    const box = boardBoxIn(WIDE, FEW_BOARD, 'band');

    expect(box.height).toBe(7 * (MAX_CELL_SIZE + CELL_GAP) - CELL_GAP);
    expect(cellSizeIn(box, FEW_BOARD)).toBe(MAX_CELL_SIZE);
  });

  it('gives up the line under the band on Ended early too', () => {
    const box = boardBoxIn(WIDE, MANY_BOARD, 'band-with-note');

    expect(box.height).toBeCloseTo(638 - 241.5 - BAND_NOTE_GAP, 1);
  });

  it('takes nothing off the board on a phone at 375 by 812, where the page scrolls', () => {
    const withBand = boardBoxIn(PHONE, MANY_BOARD, 'band');

    expect(withBand).toEqual(boardBoxIn(PHONE, MANY_BOARD, 'none'));
    expect(withBand.width).toBe(375 - 36);
    expect(cellSizeIn(withBand, MANY_BOARD)).toBeCloseTo(29, 0);
    // The box is as tall as its grid: 11 squares of 29 and ten gaps of 2.
    expect(withBand.height).toBeCloseTo(11 * 29 + 10 * CELL_GAP, 6);
  });

  it('takes the band off the board on a tablet, where the room is one window', () => {
    const box = boardBoxIn({ width: 834, height: 1112 }, MANY_BOARD, 'band');

    // 62% of 1112 less 64 is 625.4; the band is 770 × 226/640 and 18 under it.
    expect(box.width).toBe(834 - 64);
    expect(box.height).toBeCloseTo(0.62 * 1112 - 64 - (770 * (226 / 640) + 18), 6);
  });

  it('never squeezes the board below squares of 20px: past that the zone scrolls', () => {
    // A window so wide that the band alone is taller than the board's share.
    const box = boardBoxIn({ width: 2560, height: 900 }, MANY_BOARD, 'band');

    expect(box.height).toBe(11 * (MIN_CELL_SIZE + CELL_GAP) - CELL_GAP);
    expect(boardHeightsFor('band').wide).toContain(
      `calc(var(--board-rows) * ${MIN_CELL_SIZE + CELL_GAP}px - ${CELL_GAP}px)`,
    );
  });

  it(
    'keeps every 10- and 20-word board at 1440 by 900 at squares of 20px or more',
    () => {
      for (const words of [MIN_WORDS, MAX_WORDS]) {
        for (const shape of layoutsOf(words)) {
          const box = boardBoxIn(WIDE, shape, 'band');

          expect(box.height).toBeGreaterThanOrEqual(
            shape.rows * (MIN_CELL_SIZE + CELL_GAP) - CELL_GAP,
          );
          expect(cellSizeIn(box, shape)).toBeGreaterThanOrEqual(MIN_CELL_SIZE);
        }
      }
    },
    MEASUREMENT_TIMEOUT_MS,
  );
});

/**
 * The box of a phone held upright is no taller than its grid (issue #260).
 *
 * The blank a phone page used to scroll past under the last row was the box's
 * height being worked out for squares of 44 whatever the width allowed. The
 * term that caps it can only be held here in numbers: the browser works out the
 * CSS, and jsdom lays nothing out.
 */
describe('the board on a phone held upright', () => {
  const PHONE = { width: 375, height: 812 };
  const FEW_BOARD: BoardShape = { cols: 9, rows: 7 };
  const MANY_BOARD: BoardShape = { cols: 11, rows: 11 };

  /** The box before the cap: its share of the window and the 44px bound, nothing else. */
  const uncappedBox = (window: BoardBox, shape: BoardShape): BoardBox => ({
    width: window.width - 36,
    height: Math.min(
      (BOARD_HEIGHT_PERCENT / 100) * window.height,
      shape.rows * (MAX_CELL_SIZE + CELL_GAP) - CELL_GAP,
    ),
  });

  it('adds one term to the min() of the phone box and leaves the others', () => {
    expect(NARROW_BOARD_HEIGHT_CSS).toContain(BOARD_HEIGHT_CSS);
    expect(NARROW_BOARD_HEIGHT_CSS).toContain('100cqw');
  });

  it('is as tall as its grid for the six-word board at 375 by 812', () => {
    const box = boardBoxIn(PHONE, FEW_BOARD, 'none');

    // 9 columns in 339 leave 35.89 a square, and 7 rows of that with 6 gaps.
    expect(box.height).toBeCloseTo(7 * ((339 - 8 * CELL_GAP) / 9) + 6 * CELL_GAP, 6);
    expect(box.height).toBeLessThan(uncappedBox(PHONE, FEW_BOARD).height);
  });

  it('keeps the phone on its side as it was: 62% of a short window', () => {
    const box = boardBoxIn({ width: 812, height: 375 }, MANY_BOARD, 'none');

    expect(box.height).toBeCloseTo(0.62 * 375, 6);
  });

  it('caps the box at the grid’s height at 767 and at 768, a tablet being as narrow a column', () => {
    // 20 columns in 731 leave 34.65 a square, which is not 44: the width binds.
    const wide: BoardShape = { cols: 20, rows: 12 };
    const phone = boardBoxIn({ width: 767, height: 1024 }, wide, 'none');
    const tablet = boardBoxIn({ width: 768, height: 1024 }, wide, 'none');

    expect(phone.height).toBeCloseTo(12 * ((731 - 19 * CELL_GAP) / 20) + 11 * CELL_GAP, 6);
    // 20 columns in 704 leave 33.5 a square.
    expect(tablet.height).toBeCloseTo(12 * ((704 - 19 * CELL_GAP) / 20) + 11 * CELL_GAP, 6);
  });

  it('leaves the three-zone window at 1200 as it was: its own column', () => {
    const box = boardBoxIn({ width: 1200, height: 900 }, MANY_BOARD, 'none');

    // Not capped at its grid: 1200 is where the board has a column of its own.
    expect(box.height).toBe(11 * (MAX_CELL_SIZE + CELL_GAP) - CELL_GAP);
  });

  it('keeps the tablet’s box on an iPad on its side, which is not an application (1024 by 768)', () => {
    const box = boardBoxIn({ width: 1024, height: 768 }, MANY_BOARD, 'none');

    // The tablet's arrangement and sizing: 32 either side, and 62% of the window
    // less the header. The phone's would be 988 wide and 62% of 768 high.
    expect(box.width).toBe(1024 - 2 * 32);
    expect(box.height).toBeCloseTo(0.62 * 768 - FRAME_HEADER_FALLBACK, 6);
  });

  it('draws the same box from 900 high, where the tablet is an application (1024 by 900)', () => {
    const box = boardBoxIn({ width: 1024, height: 900 }, MANY_BOARD, 'none');

    expect(box.width).toBe(1024 - 2 * 32);
    expect(box.height).toBeCloseTo(0.62 * 900 - FRAME_HEADER_FALLBACK, 6);
  });

  it('keeps the wide window an application from 600 high, and a document under it (1200 by 600)', () => {
    const application = boardBoxIn({ width: 1200, height: 600 }, MANY_BOARD, 'none');
    const document = boardBoxIn({ width: 1200, height: 599 }, MANY_BOARD, 'none');

    expect(application.width).toBe(middleWidthAt(1200));
    expect(application.height).toBeCloseTo(0.78 * 600 - FRAME_HEADER_FALLBACK, 6);
    expect(document.width).toBe(1200 - 2 * 18);
    expect(document.height).toBeCloseTo(0.62 * 599, 6);
  });

  it(
    'is exactly the grid’s height on every seeded layout whose grid fits at 375 by 812',
    () => {
      let fitted = 0;

      for (const shape of gamesPlayed()) {
        const box = boardBoxIn(PHONE, shape, 'none');
        const side = cellSizeIn(box, shape);
        const grid = shape.rows * side + (shape.rows - 1) * CELL_GAP;

        if (fitsIn(box, shape)) {
          fitted += 1;
          expect(box.height).toBeCloseTo(grid, 6);
        } else {
          // Past the floor the grid scrolls inside a box that is its share of the window.
          expect(box.height).toBeLessThanOrEqual(grid + 1e-9);
        }
      }

      expect(fitted).toBeGreaterThan(0);
    },
    MEASUREMENT_TIMEOUT_MS,
  );

  it(
    'never changes the size of a square on any of the 45 seeded layouts, on three phones',
    () => {
      for (const window of [
        { width: 320, height: 568 },
        { width: 375, height: 812 },
        { width: 414, height: 896 },
      ]) {
        for (const shape of gamesPlayed()) {
          const capped = boardBoxIn(window, shape, 'none');

          expect(cellSizeIn(capped, shape)).toBeCloseTo(
            cellSizeIn(uncappedBox(window, shape), shape),
            9,
          );
          expect(capped.height).toBeLessThanOrEqual(uncappedBox(window, shape).height);
        }
      }
    },
    MEASUREMENT_TIMEOUT_MS,
  );
});
