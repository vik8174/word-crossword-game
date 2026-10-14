import { inRem } from '../scale';

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
 * How wide a zone beside the board is, in the template's own pixels
 * (`design/templates/state-tree.html` line 337: `250px minmax(0, 1fr) 250px`).
 *
 * It stopped following the window when the lobby took the template's zone
 * (issue #199). It was `clamp(10rem, 16vw, 15rem)`, which is 230.4px at 1440
 * and never more than 240, because the zone was a column of short lines that
 * had to fit a narrow window. The zone is a surface with a heading, a list and
 * a form in it now, and the drawing gives it one width from 1200 up, which is
 * also the width that leaves the board 868px at 1440 with the gap below. In
 * `rem`, so a reader who has made their text larger gets a zone that grows
 * with it.
 */
export const SIDE_ZONE_WIDTH = inRem(250);

/**
 * How far apart the zones are, from a tablet up: 14px, the template's own
 * (`.zones` in `design/templates/state-tree.html`, line 322).
 *
 * Not a step of the spacing row, which has 12 and 16 and nothing between them,
 * the same way the frame's padding is not. It is the zones' own number, and 868
 * is unreachable without it: the frame's content box at 1440 is 1396, and two
 * zones of 250 with a gap of 16 would leave the board 864 (issue #199).
 */
export const ZONES_GAP = inRem(14);
