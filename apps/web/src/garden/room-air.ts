import type { RoomScreen } from '../rooms/room-screen';
import type { GardenAir } from './garden-controls';

/**
 * Which of a room's seven screens the petals fall behind, and which one moment
 * the garden comes back for.
 *
 * Both answers are here rather than in the screens themselves because they are
 * the same decision read twice, and because a screen is rebuilt on every
 * snapshot — roughly every seven seconds all game — while neither of these may
 * be (`docs/decisions/0030-where-movement-is-allowed.md`).
 */

/**
 * Whether petals fall behind this screen.
 *
 * Written as a switch over every kind so that a screen added to `RoomScreen`
 * and not thought about here fails to compile. That is the point of the shape:
 * the silence during a game is a decision, and the way to lose it is for
 * somebody to add an eighth screen and be given whichever answer came first.
 *
 * @param kind - Which screen the room is showing
 * @returns `petals` behind it, or `still`
 *
 * @example
 * airFor('playing'); // 'still' — nothing moves behind the board
 */
export const airFor = (kind: RoomScreen['kind']): GardenAir => {
  switch (kind) {
    case 'connecting':
    case 'unavailable':
    case 'join':
    case 'lobby':
    case 'finished':
      return 'petals';
    // The board is what the screen is for, and a game ended early is not a
    // thing to put a garden behind: there are words nobody answered on it.
    case 'playing':
    case 'closed-early':
      return 'still';
  }
};

/**
 * Whether the change from one screen to the next is the end of a game.
 *
 * The greeting is this and not `finished` being on the screen, which is true
 * forever — a completed room is terminal, so an animation hanging off the
 * screen being shown would play again on every reload and again in a tab opened
 * an hour later. Somebody who opens a finished room in a fresh tab is shown a
 * calm result, and that is the answer rather than a gap.
 *
 * @param before - The screen that was, or `null` when this is the first of the session
 * @param after - The screen now
 * @returns Whether the garden should come back
 *
 * @example
 * isGreeting('playing', 'finished'); // true, once
 * isGreeting('connecting', 'finished'); // false — this tab was opened on a finished room
 */
export const isGreeting = (before: RoomScreen['kind'] | null, after: RoomScreen['kind']): boolean =>
  before === 'playing' && after === 'finished';
