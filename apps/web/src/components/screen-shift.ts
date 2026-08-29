import { createContext, useContext } from 'react';

/**
 * The movement one screen of a room makes when it gives way to the next one.
 *
 * It exists because two screens live at one address: the nickname form and the
 * lobby are both `/room/<id>`, so nothing about the page changes when a player
 * presses Join and the screen becomes a different screen
 * (`docs/decisions/0030-where-movement-is-allowed.md`). The shift is what says a
 * state changed rather than a page redrawing, which makes it a signal rather
 * than decoration.
 *
 * The numbers live here because two things read them: the component that runs
 * the shift, and the frame the room is drawn in, which has to know it is on its
 * way out (see {@link ShiftRole}).
 */

/**
 * How long a screen takes to arrive, and the screen it replaces to leave.
 *
 * Well under the ceiling the ticket set, and the ceiling is not arbitrary: this
 * is a game two people play out loud, waiting for each other, and every screen
 * change is a moment neither of them can talk through.
 */
export const SHIFT_DURATION_MS = 180;

/**
 * How far a screen travels on its way in or out.
 *
 * Short on purpose. What has to be read is the direction — one screen going,
 * another coming after it — and a whole screen width of travel would take the
 * board off the window and back, which is a page turning rather than an
 * application moving.
 */
export const SHIFT_DISTANCE = '1.5rem';

/** The system setting that means no movement at all, rather than slower movement. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * What a screen is doing in the shift it is part of:
 * - `settled` — it is the screen, and nothing is moving
 * - `arriving` — it is coming in, over the screen it replaces
 * - `leaving` — it is the screen that was, on its way out underneath
 *
 * Read by {@link RoomShell} and by nothing else, for one reason: while a shift
 * runs there are two screens on the page, and each of them draws the room's
 * header. Two headers in the same place would print over each other, so the one
 * on its way out gives up its own and lets the arriving screen's stand. That is
 * also the whole shape of the movement — the frame stands still and its
 * contents move (issue #101).
 */
export type ShiftRole = 'settled' | 'arriving' | 'leaving';

/**
 * The role of the screen being rendered, for anything drawn inside one.
 *
 * `settled` by default, so a screen rendered outside a shift — a test, or the
 * notice a room address with no id falls back to — is simply itself.
 */
export const ShiftRoleContext = createContext<ShiftRole>('settled');

/**
 * What this screen is doing in the shift around it.
 *
 * @returns Whether the screen being drawn is settled, arriving or leaving
 *
 * @example
 * const role = useShiftRole(); // 'leaving' while this screen is on its way out
 */
export const useShiftRole = (): ShiftRole => useContext(ShiftRoleContext);
