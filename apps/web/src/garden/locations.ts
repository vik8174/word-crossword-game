import type { RoomScreen } from '../rooms/room-screen';

/**
 * The four places this game is played in, and which screen stands in each.
 *
 * The garden stopped being a background the moment it got a geography. There is
 * one forest with a temple in it, and a screen is not drawn *on* it but *at* a
 * point of it: the gate a visitor arrives through, the doors of the temple, the
 * hall behind them, and the same hall at the moment a crossword is finished.
 *
 * A location is a point and a magnification, and nothing else. Where the camera
 * is, is not this file's business either — there is no camera yet, and when
 * there is one it will move between exactly these four values.
 */

/** One place a screen stands in: a point of the world, seen this close. */
export interface Location {
  /** Which of the four, for anything that has to tell them apart. */
  readonly id: 'gate' | 'doors' | 'hall' | 'congratulations';
  /** Where the middle of the window falls, in world coordinates. */
  readonly x: number;
  /** The same, down the world. */
  readonly y: number;
  /**
   * How close. `1` shows a frame 900 world units high, whatever the window;
   * `3.6` shows one 250 high, which is inside the doorway.
   */
  readonly zoom: number;
}

/** The way in: the torii deep in the green, with the whole forest around it. */
export const GATE: Location = { id: 'gate', x: 1060, y: 860, zoom: 1.0 };

/** The front of the temple, close enough that the open doorway is a doorway. */
export const DOORS: Location = { id: 'doors', x: 2150, y: 820, zoom: 1.9 };

/** Inside: the frame is smaller than the doorway, so the hall is all there is. */
export const HALL: Location = { id: 'hall', x: 2150, y: 800, zoom: 3.6 };

/**
 * The hall again, at the moment the last word goes in.
 *
 * The same point and the same magnification as {@link HALL} on purpose: what
 * ends a game is an event in the room it was played in, not a journey out of
 * it. It is a location of its own because the screen standing here is a
 * different screen, and because the camera has to know it does not move.
 *
 * One consequence of standing this close is worth naming rather than leaving
 * to be discovered. At this magnification the frame is smaller than the
 * temple's doorway, so the whole window is indoors — and the weather does not
 * come indoors (`paint-petals.ts`). The greeting a finished game asks for is
 * therefore a shower of petals with no sky to fall in, and this screen is
 * silent where it used to be full
 * (`docs/decisions/0030-where-movement-is-allowed.md`). It is a real change to
 * what a player sees at the end of a game, and what takes its place is the
 * cloth in the ticket that brings the camera.
 */
export const CONGRATULATIONS: Location = { id: 'congratulations', x: 2150, y: 800, zoom: 3.6 };

/**
 * Where the garden stands when nothing has said otherwise.
 *
 * The gate, because it is where every first visit is: the landing page and the
 * page a game is made on are both this side of the temple, and a room that has
 * been left takes its own places with it.
 */
export const DEFAULT_LOCATION = GATE;

/**
 * Which place this screen of a room is shown in.
 *
 * Written as a switch over every kind, with no `default`, for the same reason
 * `airFor` is: a screen added to `RoomScreen` and not placed anywhere fails to
 * compile. An eighth screen is a decision about where in the world it happens,
 * and the way to lose that decision is to let it inherit whichever answer came
 * first.
 *
 * Two screens have no place of their own, and `null` is that answer rather than
 * an oversight. `connecting` is the wait before the room has said what it is,
 * and `unavailable` is the news that it never will — neither is a phase of a
 * game, so neither moves anybody. They are shown wherever the garden already
 * stands, which for an invite link opened cold is the gate and for a room that
 * expired mid-game is the hall it expired in.
 *
 * @param kind - Which screen the room is showing
 * @returns The place it stands in, or `null` when it stands where it already is
 *
 * @example
 * locationFor('playing'); // HALL — inside, with the board on the shoji
 * locationFor('connecting'); // null — wherever the garden was
 */
export const locationFor = (kind: RoomScreen['kind']): Location | null => {
  switch (kind) {
    case 'connecting':
    case 'unavailable':
      return null;
    case 'join':
      return GATE;
    case 'lobby':
      return DOORS;
    case 'playing':
    case 'closed-early':
      return HALL;
    case 'finished':
      return CONGRATULATIONS;
  }
};
