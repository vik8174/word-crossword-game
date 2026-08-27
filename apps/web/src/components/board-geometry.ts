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
 * percentage.
 *
 * The board needs a height it can be told rather than one it works out from its
 * own contents: a CSS container only reports its height to what is inside it
 * when its size is settled without them (`container-type: size`). This is that
 * height — and it is the number that decides how often a game fits, because the
 * board comes out nearly square while a screen is wide and low.
 */
export const BOARD_HEIGHT_PERCENT = 70;

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
export const BOARD_HEIGHT_CSS = `min(${BOARD_HEIGHT_PERCENT}dvh, calc(var(--board-rows) * ${MAX_CELL_SIZE + CELL_GAP}px - ${CELL_GAP}px))`;

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
