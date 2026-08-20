import { abandonedSeatIn, roomAccessFor } from './room-access';
import { isGameFinished } from './room-completion';
import type { RoomDocument } from './room-document';
import type { RoomConnection } from './use-room-connection';

/**
 * Which screen the room behind a link is showing, decided as a value.
 *
 * The room screen has seven of them and they are mutually exclusive, so this
 * module answers with one — never with a set of flags a caller has to combine.
 * It is the same reasoning `docs/decisions/0009-room-document-schema.md` applies
 * to the document itself ("one field with three values, not a set of booleans,
 * so illegal combinations cannot be expressed"), applied to what is rendered.
 *
 * Nothing here reaches for the DOM or for Firebase: it composes what
 * {@link RoomConnection}, {@link roomAccessFor} and {@link isGameFinished}
 * already worked out, so the screen a given room shows a given viewer can be
 * checked with a table and no rendering at all.
 */

/**
 * Why a room cannot be entered:
 * - `missing` — nothing lives at this link, or nothing that is a room
 * - `expired` — the room outlived its 24 hours and refuses every write
 * - `started` — the words are dealt out; the game runs with the players it began with
 * - `finished` — the room is closed; the game it held is over
 * - `full` — both players are already in it
 * - `refused` — the room turned this visitor's join down, and has not said why yet
 * - `connection` — the app could not reach Firebase at all
 *
 * The four in the middle are exactly the refusals {@link roomAccessFor} names,
 * and {@link roomScreenFor} hands them straight over: a refusal this list has no
 * wording for stops compiling there rather than reaching a player as a blank
 * notice.
 *
 * The last two come from somewhere else entirely — a call that failed rather
 * than a room that was read — which is why `refused` claims so much less than
 * the four above it: Firestore answers a write its rules turned down with
 * `permission-denied` and nothing more, so which rule refused is not something
 * the client is told (see {@link screenAfterRefusedJoin}).
 */
export type RoomUnavailableReason =
  'missing' | 'expired' | 'started' | 'finished' | 'full' | 'refused' | 'connection';

/**
 * What the room screen is showing right now:
 * - `connecting` — signing in and waiting for the first snapshot
 * - `unavailable` — there is no room to show, and this is why
 * - `join` — a free seat and a nickname to enter, and whose seat it was if it
 *   had to be given up
 * - `lobby` — in the room, waiting for the owner to deal the words out
 * - `playing` — the game is on
 * - `finished` — the crossword was filled in and the room is closed
 * - `closed-early` — the room is closed with words still unanswered
 *
 * The last two are one status apart from nothing: `completed` is written by a
 * client and the security rules cannot check it against the board, so the two
 * are told apart by {@link isGameFinished} rather than by the status alone (see
 * `docs/decisions/0012-ending-a-game-from-the-received-state.md`).
 */
export type RoomScreen =
  | { readonly kind: 'connecting' }
  | { readonly kind: 'unavailable'; readonly reason: RoomUnavailableReason }
  | {
      readonly kind: 'join';
      readonly playerId: string;
      /**
       * UID whose seat this visitor would be taking, when the room is full and
       * one of its players has given theirs up. `null` when a seat was simply
       * free — which is every arrival at a room still filling up.
       */
      readonly seatToRelease: string | null;
    }
  | { readonly kind: 'lobby'; readonly room: RoomDocument; readonly viewerId: string }
  | { readonly kind: 'playing'; readonly room: RoomDocument; readonly viewerId: string }
  | { readonly kind: 'finished'; readonly room: RoomDocument; readonly viewerId: string }
  | { readonly kind: 'closed-early'; readonly room: RoomDocument; readonly viewerId: string };

/** Which of the three screens a room this player is already in has to show. */
const screenInsideRoom = (room: RoomDocument, viewerId: string): RoomScreen => {
  switch (room.status) {
    case 'lobby':
      return { kind: 'lobby', room, viewerId };
    case 'playing':
      return { kind: 'playing', room, viewerId };
    case 'completed':
      return isGameFinished(room)
        ? { kind: 'finished', room, viewerId }
        : { kind: 'closed-early', room, viewerId };
  }
};

/**
 * The screen this connection is showing this viewer.
 *
 * The order is the one the screen has always followed: how far the connection
 * got comes first, because a room nobody has read yet cannot be judged; then
 * what this player may do with the room, which is {@link roomAccessFor}'s
 * question and not one this module re-answers; and only then, for a player who
 * is in, which phase of the game they are in.
 *
 * @param connection - The room as {@link RoomConnection} last reported it
 * @param now - The moment to judge expiry against
 * @returns The one screen to render, with what that screen needs and nothing else
 *
 * @example
 * roomScreenFor(connection, new Date()); // { kind: 'lobby', room, viewerId }
 */
export const roomScreenFor = (connection: RoomConnection, now: Date): RoomScreen => {
  if (connection.status === 'connecting') {
    return { kind: 'connecting' };
  }

  if (connection.status === 'failed') {
    return { kind: 'unavailable', reason: 'connection' };
  }

  if (connection.status === 'missing') {
    return { kind: 'unavailable', reason: 'missing' };
  }

  const { room, playerId } = connection;
  // Judged on every render, and a render follows every snapshot — good enough
  // for a room whose lifetime is measured in hours.
  const access = roomAccessFor(room, playerId, now);

  if (access === 'joined') {
    return screenInsideRoom(room, playerId);
  }

  if (access === 'joinable') {
    // Worked out here rather than by the form, so what the join writes is
    // decided from the same room, at the same moment, as the decision to offer
    // the form at all.
    return { kind: 'join', playerId, seatToRelease: abandonedSeatIn(room, now) };
  }

  // Every refusal `roomAccessFor` can answer with is a reason the notice has
  // wording for, and this line is where the compiler checks that it stays so.
  return { kind: 'unavailable', reason: access };
};

/**
 * The screen to show once the room has turned this visitor's join down.
 *
 * The nickname form is the one screen a refusal contradicts: it was offered
 * because the room read as joinable, and the write proved that reading wrong.
 * Every other screen was derived from a room this visitor is either in or
 * already shut out of, so a stale refusal has nothing to say about it and is
 * passed over.
 *
 * Deliberately not a reason worked out from the document: Firestore answers a
 * refused write with `permission-denied` and no more, so a room that filled up,
 * a game that was dealt out while a nickname was being typed and a room that
 * ran out its 24 hours arrive here as the same fact. What is said is therefore
 * only what is certainly true — the room would not take them — and it stands
 * for as long as it takes the next snapshot to say something better, which the
 * caller signals by asking against a room that has moved on.
 *
 * @param screen - The screen the room document alone calls for
 * @param wasRefused - Whether this very room refused this visitor's join
 * @returns The screen to render
 *
 * @example
 * screenAfterRefusedJoin({ kind: 'join', playerId, seatToRelease: null }, true);
 * // { kind: 'unavailable', reason: 'refused' }
 */
export const screenAfterRefusedJoin = (screen: RoomScreen, wasRefused: boolean): RoomScreen =>
  wasRefused && screen.kind === 'join' ? { kind: 'unavailable', reason: 'refused' } : screen;

/**
 * Whether this screen is one somebody else could still be invited into.
 *
 * The invite link is worth showing for exactly as long as a link can still let
 * anyone in, which is while the room waits in its lobby — a started, finished
 * or closed room leads a newcomer to a refusal, and one that is not there leads
 * nowhere at all. `connecting` counts as open because the link is built from
 * the address rather than from the document: withholding it until the first
 * snapshot would make the owner wait to invite anybody, which is the thing
 * being fixed.
 *
 * A switch rather than a list of kinds, so a screen added to {@link RoomScreen}
 * has to say whether a room showing it can still be joined instead of silently
 * defaulting to hiding the link.
 *
 * @param screen - The screen the room is showing, from {@link roomScreenFor}
 * @returns Whether the invite link still leads anybody in
 *
 * @example
 * isOpenToNewPlayers({ kind: 'connecting' }); // true
 */
export const isOpenToNewPlayers = (screen: RoomScreen): boolean => {
  switch (screen.kind) {
    case 'connecting':
    case 'join':
    case 'lobby':
      return true;
    case 'unavailable':
    case 'playing':
    case 'finished':
    case 'closed-early':
      return false;
  }
};
