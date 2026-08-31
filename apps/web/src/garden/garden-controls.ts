import { createContext, useContext } from 'react';

import type { Location } from './locations';

/**
 * What anything drawn inside the garden can ask of it.
 *
 * It is three verbs and no state, on purpose. Whether petals are falling, and
 * where in the world the window is standing, are the garden's own business and
 * nothing else's — a screen that could read either would sooner or later be
 * written to decide something by it.
 */

/**
 * Whether petals are falling behind the page.
 *
 * `still` is not "fewer petals" or "slower petals" — it is a game being played,
 * where the board is the thing the screen is for and movement in the corner of
 * the eye belongs to somebody who is reading letters and listening to another
 * person talk (`docs/decisions/0030-where-movement-is-allowed.md`).
 */
export type GardenAir = 'petals' | 'still';

/**
 * What the air is anywhere nothing has said otherwise.
 *
 * Petals, rather than nothing: the game is the exception in this app and every
 * other screen is the ordinary case, so a page that forgets to say gets the
 * background it should have had.
 */
export const DEFAULT_AIR: GardenAir = 'petals';

/** The garden, as the app is allowed to touch it. */
export interface GardenControls {
  /** Says what the air should be from now on. */
  readonly showAir: (air: GardenAir) => void;
  /** Says which of the four places the window is standing in from now on. */
  readonly showLocation: (location: Location) => void;
  /** Asks for the greeting: a sky that starts thick and thins back out. */
  readonly greet: () => void;
}

/**
 * No garden at all, which is what a screen rendered on its own is standing in.
 *
 * Every test in this app renders a screen without the app around it, and a
 * screen that threw for want of a background would make the garden a thing
 * every one of them had to know about.
 */
const NO_GARDEN: GardenControls = {
  showAir: () => {},
  showLocation: () => {},
  greet: () => {},
};

export const GardenControlsContext = createContext<GardenControls>(NO_GARDEN);

/**
 * The garden this screen is being drawn in.
 *
 * @returns The three things a screen may ask of it
 *
 * @example
 * const { showAir, showLocation, greet } = useGardenControls();
 */
export const useGardenControls = (): GardenControls => useContext(GardenControlsContext);
