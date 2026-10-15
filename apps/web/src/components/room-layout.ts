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
export const APP_SHELL_MIN_WIDTH = 768;

/** How far the room stands from either side of a phone's window, in pixels (`--pad`, 18). */
export const PHONE_SIDE_PX = 18;

/** The same on a tablet: 32. */
export const TABLET_SIDE_PX = 32;

/**
 * Shortest window the application layout is used in.
 *
 * Width alone would hand it to a phone turned on its side — 844 by 390 on a
 * recent one — where a fixed-height screen has nothing left over once the
 * keyboard is up. What makes the shell worth having is height, so height is
 * asked for.
 */
export const APP_SHELL_MIN_HEIGHT = 600;

/**
 * Narrowest window the board and both of its indexes stand side by side in.
 *
 * Below it they still all fit on one screen, but underneath the board rather
 * than beside it: two columns of a readable width plus a board leave about 500
 * pixels for the board on a tablet, which is less than the room gives it today.
 * The board is the thing the screen is for, so it keeps the width and the
 * indexes take the strip under it.
 */
export const THREE_ZONE_MIN_WIDTH = 1200;

/**
 * When the window is a phone held upright: narrower than {@link APP_SHELL_MIN_WIDTH}.
 *
 * Not the whole of the document layout. A phone on its side (844 by 390) is a
 * document too, and it is wide enough to fall outside this query; the board
 * keeps the fixed share of the window there (ADR 0029).
 */
export const NARROW_WINDOW = `@media (max-width: ${APP_SHELL_MIN_WIDTH - 1}px)`;

/** When the room is an application: a fixed height with no page scroll. */
export const APP_SHELL = `@media (min-width: ${APP_SHELL_MIN_WIDTH}px) and (min-height: ${APP_SHELL_MIN_HEIGHT}px)`;

/** When the board has a column of its own, with an index either side of it. */
export const THREE_ZONES = `@media (min-width: ${THREE_ZONE_MIN_WIDTH}px) and (min-height: ${APP_SHELL_MIN_HEIGHT}px)`;

/**
 * How wide a zone beside the board is, in pixels: the template's own 290
 * (`.zones`, `design/templates/state-tree.html` line 227:
 * `290px minmax(0, 1fr) 290px`).
 *
 * It was 250, and before that a clamp of the window, while a zone was a tile
 * with a form in it (issue #199). The room is three columns on the ground now,
 * and the drawing gives them 290 from 1200 up, which leaves the board 684px at
 * 1440 with the gap and the sides below.
 */
export const SIDE_ZONE_PX = 290;

/**
 * The same in `rem`, so that a reader who has made their text larger gets a zone
 * that grows with it.
 */
export const SIDE_ZONE_WIDTH = inRem(SIDE_ZONE_PX);

/**
 * How far apart the zones are, in pixels: 40 from 1200 up, the template's own
 * (`.zones` gap, line 227). The tablet and the phone stack them 28 apart.
 */
export const ZONES_GAP_PX = 40;

/** The same in `rem`. */
export const ZONES_GAP = inRem(ZONES_GAP_PX);

/**
 * How far the room stands from either side of a wide window, in pixels: 48
 * (`--pad` in the template's wide layout, line 220).
 */
export const WIDE_SIDE_PX = 48;

/**
 * How wide the middle zone is in a window `width` pixels wide, from the three
 * zones up. The sides, the zones and the two gaps are all fixed, so the board
 * gets the rest.
 *
 * @param width - The window's width in pixels
 * @returns The middle zone's width in pixels
 *
 * @example
 * middleWidthAt(1440); // 684
 */
export const middleWidthAt = (width: number): number =>
  width - 2 * WIDE_SIDE_PX - 2 * SIDE_ZONE_PX - 2 * ZONES_GAP_PX;
