import type { RoomScreen } from '../rooms/room-screen';
import { logGameEvent } from './analytics';
import { redactRoomId } from './redaction';

/**
 * The four screens a player passes on the way to the first word being
 * explained, and the reporting of having reached one.
 *
 * Where somebody stops is the question this exists to answer, and none of the
 * three events this app already sends can: they all fire after a player is in.
 * A page view cannot answer it either — the nickname form and the lobby are two
 * screens at one address (`/room/<id>`), so the pair that is most worth telling
 * apart is exactly the pair a path cannot.
 */

/**
 * A screen between opening the app and the first word:
 * - `home` — the landing page
 * - `create` — the word list, at `/create`
 * - `join` — the nickname form behind an invite link
 * - `lobby` — in the room, waiting for the owner to deal the words out
 *
 * Four literals rather than free text, and that is what makes reporting a
 * screen safe to type: there is no value of this type that a player wrote, so
 * nothing a player wrote can be reported as one. See `GameEventParams` in
 * `analytics.ts`.
 */
export type FunnelScreen = 'home' | 'create' | 'join' | 'lobby';

/**
 * Which funnel screen a room screen is, and `null` where it is none of them.
 *
 * The room screen shows seven things and two of them are in the funnel, so this
 * is where `/room/<id>` is split into the two arrivals a path cannot tell apart.
 * A switch rather than a list, so a screen added to {@link RoomScreen} has to
 * say where in the funnel it sits instead of silently falling outside it — the
 * same reasoning `isOpenToNewPlayers` applies next door.
 *
 * It takes the kind and not the screen because only the kind may matter: the
 * screen object is rebuilt on every snapshot, and a room gets one every fifteen
 * seconds from each client marking itself present (issue #47). What the arrival
 * is recognised by has to be a value that changes when the player moves and at
 * no other time.
 *
 * @param kind - Which screen the room is showing, from `roomScreenFor`
 * @returns The funnel screen it is, or `null` when it is not part of the funnel
 *
 * @example
 * funnelScreenFor('lobby'); // 'lobby'
 * funnelScreenFor('playing'); // null
 */
export const funnelScreenFor = (kind: RoomScreen['kind']): FunnelScreen | null => {
  switch (kind) {
    case 'join':
      return 'join';
    case 'lobby':
      return 'lobby';
    case 'connecting':
    case 'unavailable':
    case 'playing':
    case 'finished':
    case 'closed-early':
      return null;
  }
};

/**
 * Reports that a player reached one of the four screens.
 *
 * The name goes through the redaction like every other piece of text this app
 * sends — it is the only way to produce the type an event parameter accepts —
 * and it comes out unchanged, being a literal with no room in it.
 *
 * @param screen - The screen that was reached
 *
 * @example
 * void logScreenReached('lobby');
 */
export const logScreenReached = async (screen: FunnelScreen): Promise<void> =>
  logGameEvent('screen_reached', { screen: redactRoomId(screen) });
