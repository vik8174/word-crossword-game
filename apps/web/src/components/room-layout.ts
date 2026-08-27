/**
 * Where the room puts its three zones, and from which window on.
 *
 * The room is laid out three ways, and which one a window gets is decided by
 * the window alone — these are media queries rather than a measurement, so no
 * render depends on the size of anything and there is no first frame drawn at
 * the wrong width.
 *
 * The numbers live here because two things read them: the shell that lays the
 * zones out, and the board, whose share of the height depends on whether it has
 * a column to itself (see `board-geometry.ts`).
 */

/**
 * Narrowest window the room stops being a document and becomes an application:
 * a fixed height, no page scroll, and the board always on screen.
 *
 * A tablet held upright is the smallest screen that is worth it, and it is also
 * the smallest one it works on. Below this the board is a scrolling document,
 * which is what a phone gets: a square a player fills in is an `input`, so every
 * move opens a virtual keyboard over half the screen, and `100dvh` on iOS Safari
 * is not the height that is visible.
 */
const APP_SHELL_MIN_WIDTH = 768;

/**
 * Shortest window the application layout is used in.
 *
 * Width alone would hand it to a phone turned on its side — 844 by 390 on a
 * recent one — where a fixed-height screen has nothing left over once the
 * keyboard is up. What makes the shell worth having is height, so height is
 * asked for.
 */
const APP_SHELL_MIN_HEIGHT = 600;

/**
 * Narrowest window the board and both of its indexes stand side by side in.
 *
 * Below it they still all fit on one screen, but underneath the board rather
 * than beside it: two columns of a readable width plus a board leave about 500
 * pixels for the board on a tablet, which is less than the room gives it today.
 * The board is the thing the screen is for, so it keeps the width and the
 * indexes take the strip under it.
 */
const THREE_ZONE_MIN_WIDTH = 1200;

/** When the room is an application: a fixed height with no page scroll. */
export const APP_SHELL = `@media (min-width: ${APP_SHELL_MIN_WIDTH}px) and (min-height: ${APP_SHELL_MIN_HEIGHT}px)`;

/** When the board has a column of its own, with an index either side of it. */
export const THREE_ZONES = `@media (min-width: ${THREE_ZONE_MIN_WIDTH}px) and (min-height: ${APP_SHELL_MIN_HEIGHT}px)`;

/**
 * How wide a zone beside the board is.
 *
 * It follows the window rather than standing still, because what it holds is a
 * list of short lines: at the floor an entry such as `12 down — bridge` takes
 * two lines, and past the ceiling it would be a column of white space next to
 * the one thing on the screen that wants more room.
 */
export const SIDE_ZONE_WIDTH = 'clamp(10rem, 16vw, 15rem)';
