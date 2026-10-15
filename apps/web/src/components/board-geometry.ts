/**
 * How large a square of the crossword is, and where that size comes from.
 *
 * The size is worked out by the browser rather than by React: the board is a
 * CSS container, and the side of a square is a `clamp()` over the space that
 * container has along both axes. Nothing here measures anything, nothing
 * listens for a resize, and no render depends on the width of the window.
 *
 * The numbers live in one place because two things read them: the stylesheet
 * this module builds, and the test that holds the release to what it promised.
 * Written twice they would drift, and the test would keep asserting a promise
 * the board had stopped making.
 */

import { belowFrame, FRAME_HEADER_FALLBACK } from './frame-height';
import { APP_SHELL_MIN_HEIGHT, middleWidthAt, THREE_ZONE_MIN_WIDTH } from './room-layout';

/** A rectangle the board is drawn into, in CSS pixels. */
export interface BoardBox {
  readonly width: number;
  readonly height: number;
}

/** How many squares across and down a laid-out crossword has. */
export interface BoardShape {
  readonly cols: number;
  readonly rows: number;
}

/**
 * Smallest side a square may shrink to, in pixels.
 *
 * Below this a letter stops being comfortably readable, so the board stops
 * shrinking and starts scrolling instead — in both directions.
 */
export const MIN_CELL_SIZE = 20;

/**
 * Largest side a square may grow to, in pixels.
 *
 * A short word list on a large screen would otherwise be drawn in squares of
 * sixty or seventy pixels, which reads as a child's toy rather than as a
 * crossword.
 */
export const MAX_CELL_SIZE = 44;

/** Space between two neighbouring squares, in pixels. */
export const CELL_GAP = 2;

/**
 * The share of the window's height the board may take for itself, as a
 * percentage, wherever it shares its column with something else.
 *
 * The board needs a height it can be told rather than one it works out from its
 * own contents: a CSS container only reports its height to what is inside it
 * when its size is settled without them (`container-type: size`). This is that
 * height.
 *
 * That leaves the rest of the window to whatever is stacked with the board: the
 * two indexes under it on a tablet, and everything the room says on a phone,
 * where the page scrolls anyway (see `room-layout.ts`). It buys nothing to raise
 * it there — on both of those the board runs out of width long before it runs
 * out of height.
 */
export const BOARD_HEIGHT_PERCENT = 62;

/**
 * The same share on a screen wide enough for the board to have a column to
 * itself, with the indexes beside it rather than under it.
 *
 * This is the number that decides how often a game fits, and it is the one the
 * room's layout exists to raise: a crossword comes out nearly square while a
 * desktop window is wide and low, so on that screen it is the height that runs
 * out first. What the rest of the window pays for is the header, the line that
 * says what the board is for, and the two hints under it — about 180 pixels of
 * a 900-pixel window, measured rather than guessed, with the board taking the
 * 702 that are left.
 */
export const WIDE_BOARD_HEIGHT_PERCENT = 78;

/**
 * The height the board is given as a share of the window, never more than its
 * squares could use.
 *
 * Where `belowHeader` is set the share is of the window less the frame's header
 * (`frame-height.ts`): the room is one window then, and the header is part of it.
 */
const boardHeightCss = (percent: number, belowHeader: boolean): string => {
  const share = belowHeader ? belowFrame(`${percent}dvh`) : `${percent}dvh`;

  return `min(${share}, calc(var(--board-rows) * ${MAX_CELL_SIZE + CELL_GAP}px - ${CELL_GAP}px))`;
};

/**
 * The height the board is given: its share of the window, and never more than
 * its own squares could use.
 *
 * The second half of the `min()` is what keeps a six-row game from sitting in a
 * box two thirds of the window tall with nothing under it. It cannot change the
 * size of a square — a board short enough for it is a board whose squares had
 * already reached {@link MAX_CELL_SIZE}.
 *
 * Reads `--board-rows`, which {@link boardVariables} writes.
 */
export const BOARD_HEIGHT_CSS = boardHeightCss(BOARD_HEIGHT_PERCENT, false);

/**
 * The same, where the room is one window (from 768 by 600 up) and the frame's
 * header is part of it: the share is of what the header leaves.
 *
 * Not on a phone. There the room is a page that scrolls and the header only adds
 * to the page, so the board keeps its share of the whole window and no board
 * scrolls inside a scrolling page (ADR 0029).
 */
export const APP_SHELL_BOARD_HEIGHT_CSS = boardHeightCss(BOARD_HEIGHT_PERCENT, true);

/** The same, for the screen where the board has a column of its own. */
export const WIDE_BOARD_HEIGHT_CSS = boardHeightCss(WIDE_BOARD_HEIGHT_PERCENT, true);

/**
 * The drawing above the board, the "band": the street cropped to the strip
 * between the balconies, with the answered words hanging on the line
 * (`state-tree.html`, `scene({ crop: "band" })`). Its viewBox is 640 by 226, so
 * it is as tall as 226/640 of the width it is given.
 */
const BAND_ASPECT = 226 / 640;

/** The space between the band and the board (`margin-top: 18px` on the board, line 1021). */
const BAND_GAP = 18;

/**
 * The smallest square the band is allowed to leave the board.
 *
 * The band is a picture, and the board is the thing the screen is for: the band
 * is shown only when the squares the board has left are still comfortable ones,
 * 36px and up (Viktor's ruling, 2026-10-14), and is left out when showing it
 * would cost the board more than that. Nothing is shrunk to make room for it.
 */
export const BAND_MIN_CELL_SIZE = 36;

/**
 * How much height the band takes in a window `width` pixels wide, gap included.
 * It fills the middle zone, so it is as tall as that zone is wide.
 *
 * @param width - The window's width in pixels
 * @returns The band's height and the space under it, in pixels
 */
const bandExtentAt = (width: number): number => middleWidthAt(width) * BAND_ASPECT + BAND_GAP;

/**
 * The band's height as the browser works it out, for the board's own height to
 * subtract: the middle zone is a size container in width (`RoomShell`), so
 * `cqw` is that zone's width.
 */
const BAND_EXTENT_CSS = `calc(100cqw * 226 / 640 + ${BAND_GAP}px)`;

/**
 * The same board height with the band above it: its share of the window less
 * the header and less the band, never more than the squares could use.
 *
 * The band is only ever shown from {@link THREE_ZONE_MIN_WIDTH} up, where the
 * board has a column to itself, so this is the wide screen's height and no
 * other's.
 */
export const WIDE_BOARD_HEIGHT_BELOW_BAND_CSS = `min(calc(${belowFrame(`${WIDE_BOARD_HEIGHT_PERCENT}dvh`)} - ${BAND_EXTENT_CSS}), calc(var(--board-rows) * ${MAX_CELL_SIZE + CELL_GAP}px - ${CELL_GAP}px))`;

/**
 * Whether the band is shown above a board of this shape in a window of this size.
 *
 * One rule: from 1200 wide (where the board has a column to itself), and only
 * where the board, given the share of the window that is left once the band
 * has taken its height, still has squares of at least
 * {@link BAND_MIN_CELL_SIZE}. Under 1200 it is never shown, and neither is it in
 * a window too short to be an application. A list of 10 words comes out at
 * roughly 14 by 11 (`docs/manual-checks.md`) and one of 20 at about 22 by 23
 * (ADR 0029): at 1440 by 900 both come out without the band, and a game of six
 * words, which the app does not deal but the drawing does, shows it.
 *
 * The same arithmetic as {@link cellSizeIn}, done once for the whole decision
 * and in numbers, so it can be tested without a browser to lay anything out.
 *
 * @param window - The window's width and height in pixels
 * @param shape - The laid-out crossword's size in squares
 * @returns `true` when the band is drawn
 *
 * @example
 * bandIsShown({ width: 1440, height: 900 }, { cols: 9, rows: 7 }); // true
 * bandIsShown({ width: 1440, height: 900 }, { cols: 14, rows: 11 }); // false
 */
export const bandIsShown = (window: BoardBox, shape: BoardShape): boolean => {
  if (window.width < THREE_ZONE_MIN_WIDTH || window.height < APP_SHELL_MIN_HEIGHT) {
    return false;
  }

  const rows = Math.max(1, shape.rows);
  const share =
    (WIDE_BOARD_HEIGHT_PERCENT / 100) * window.height -
    FRAME_HEADER_FALLBACK -
    bandExtentAt(window.width);
  const height = Math.min(share, rows * (MAX_CELL_SIZE + CELL_GAP) - CELL_GAP);

  return cellSizeIn({ width: middleWidthAt(window.width), height }, shape) >= BAND_MIN_CELL_SIZE;
};

/** The custom property the side of a square is published as. */
const CELL_PROPERTY = '--board-cell';

/** How anything drawn inside the board asks for the side of a square. */
export const CELL_SIDE = `var(${CELL_PROPERTY})`;

/**
 * What the grid sets that property to: the side of one square, as the browser
 * works it out from the space the board has along both axes.
 *
 * Both terms of the `min()` are the same sum: take the gaps out of what there
 * is, and divide what is left between the squares. Whichever axis runs out
 * first decides the size, and which one that is depends on how much of the page
 * the board is given: in the column it is drawn in today the width goes first,
 * while a board handed the width of a desktop window runs out of height
 * instead — a crossword comes out nearly square and a screen is wide and low.
 * Counting one axis is what cannot answer both cases.
 *
 * It belongs on a descendant of the container it measures, which is why it is
 * the grid that carries it and not the box around it: `cqw` and `cqh` read on
 * the container itself would report the size of *its* container instead.
 */
export const cellSizeVariable: Record<string, string> = {
  [CELL_PROPERTY]: `clamp(${MIN_CELL_SIZE}px, min((100cqw - (var(--board-cols) - 1) * ${CELL_GAP}px) / var(--board-cols), (100cqh - (var(--board-rows) - 1) * ${CELL_GAP}px) / var(--board-rows)), ${MAX_CELL_SIZE}px)`,
};

/** The columns of the grid: as many as the crossword has, each one square wide. */
export const GRID_COLUMNS_CSS = `repeat(var(--board-cols), ${CELL_SIDE})`;

/**
 * The shape of the board, handed to CSS as custom properties.
 *
 * A grid of no rows or no columns — a room whose words have not been dealt out
 * yet — is reported as one of each rather than as zero: the arithmetic above
 * divides by both, and nothing is drawn either way.
 *
 * @param shape - The laid-out crossword's size in squares
 * @returns Custom properties to set on the board's container
 *
 * @example
 * <Box sx={{ ...boardVariables(view), height: BOARD_HEIGHT_CSS }} />
 */
export const boardVariables = ({ cols, rows }: BoardShape): Record<string, string> => ({
  '--board-cols': String(Math.max(1, cols)),
  '--board-rows': String(Math.max(1, rows)),
});

/** The side a square would take if it were free to ignore both bounds. */
const unboundedSideIn = (box: BoardBox, { cols, rows }: BoardShape): number =>
  Math.min(
    (box.width - (Math.max(1, cols) - 1) * CELL_GAP) / Math.max(1, cols),
    (box.height - (Math.max(1, rows) - 1) * CELL_GAP) / Math.max(1, rows),
  );

/**
 * The side of a square, in pixels — the same arithmetic
 * {@link cellSizeVariable} hands to the browser, done in numbers.
 *
 * It exists so the size a screen produces can be reasoned about without a
 * browser to lay it out. A test cannot get it from the stylesheet: `clamp()`,
 * `min()` and container units are worked out during layout, and jsdom has none.
 *
 * @param box - The rectangle the board is drawn into
 * @param shape - The laid-out crossword's size in squares
 * @returns The side of one square, between the two bounds
 *
 * @example
 * cellSizeIn({ width: 552, height: 630 }, { cols: 22, rows: 23 }); // 25.13…
 */
export const cellSizeIn = (box: BoardBox, shape: BoardShape): number =>
  Math.min(Math.max(unboundedSideIn(box, shape), MIN_CELL_SIZE), MAX_CELL_SIZE);

/**
 * Whether a board of this shape fits that rectangle whole — no scrolling in
 * either direction.
 *
 * It fits exactly when the size the space asks for is one a square is allowed
 * to take: below {@link MIN_CELL_SIZE} the square stops shrinking, and what
 * does not fit then goes behind a scrollbar.
 *
 * @param box - The rectangle the board is drawn into
 * @param shape - The laid-out crossword's size in squares
 * @returns `true` when the whole crossword is on screen at once
 *
 * @example
 * fitsIn({ width: 552, height: 630 }, { cols: 30, rows: 30 }); // false
 */
export const fitsIn = (box: BoardBox, shape: BoardShape): boolean =>
  unboundedSideIn(box, shape) >= MIN_CELL_SIZE;
