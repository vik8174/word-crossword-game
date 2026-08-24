import { abandonedSeatIn, hasFreeSeatIn, roomAccessFor } from './room-access';
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
 * The last two are not one status apart, and that is the part worth reading
 * twice. A room ended by a player says `closed` and lands on the second of them
 * without a further question. A room saying `completed` still has to answer one:
 * that status is written by a client and the security rules cannot check it
 * against the board, so a client that knows the room id can write it over a game
 * nobody played. Only the board can tell those apart, which is why the celebration
 * waits on {@link isGameFinished} and not on the status
 * (`docs/decisions/0012-ending-a-game-from-the-received-state.md`,
 * `docs/decisions/0027-a-game-a-player-can-end.md`).
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

/**
 * Which of the four screens a room this player is already in has to show.
 *
 * Only one of the four costs more than reading the status, and the extra
 * question is a guard rather than a nicety: `completed` earns the celebration
 * only together with a board that really is full, because that field alone can
 * be written over a game nobody played and the celebration spells the whole
 * crossword out. Every other ending — a room its players closed, and a
 * `completed` no board backs up — is the same screen, which shows no word
 * nobody answered.
 */
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
    case 'closed':
      return { kind: 'closed-early', room, viewerId };
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
 * Whether the viewer of this screen has a seat left to invite somebody into.
 *
 * Two facts, and the link is worth showing only when both hold: the viewer is
 * the host, and the room still has a seat for whoever they send it to.
 *
 * A guest is never offered it. They arrived by that very link, so it is already
 * in their address bar — and a room is played by exactly two
 * (`docs/decisions/0024-two-players-are-the-product-not-the-algorithm.md`), so
 * the moment they walked in it stopped leading anybody anywhere but a refusal.
 * Passing it on is no longer the same act whichever player performs it, which
 * is the line `docs/decisions/0021-one-room-address.md` drew and
 * `docs/decisions/0026-the-invite-link-belongs-to-the-host.md` redraws.
 *
 * The free seat is {@link hasFreeSeatIn}'s answer rather than a count of
 * players, and that is the whole reason `now` is a parameter here: a guest whose
 * mark has gone stale leaves a seat their host may fill again, and a link that
 * did not come back would leave them with a room they cannot re-fill
 * (`docs/decisions/0025-what-happens-to-the-seat-of-a-player-who-left.md`).
 *
 * Only the lobby can satisfy either fact. `join` is a visitor who is not in the
 * room, so certainly not its host; `connecting` has no document to tell one from
 * the other, and guessing wrong shows a guest a link they should never see. That
 * is the price this record accepts: the host waits for the first snapshot.
 *
 * A switch rather than a list of kinds, so a screen added to {@link RoomScreen}
 * has to say whether its viewer has anybody left to invite instead of silently
 * defaulting to hiding the link.
 *
 * @param screen - The screen the room is showing, from {@link roomScreenFor}
 * @param now - The moment to judge the presence marks against
 * @returns Whether this viewer has a free seat of their own to give away
 *
 * @example
 * hasSomebodyToInvite({ kind: 'lobby', room, viewerId: room.ownerId }, new Date()); // true
 */
export const hasSomebodyToInvite = (screen: RoomScreen, now: Date): boolean => {
  switch (screen.kind) {
    case 'lobby':
      return screen.viewerId === screen.room.ownerId && hasFreeSeatIn(screen.room, now);
    case 'connecting':
    case 'join':
    case 'unavailable':
    case 'playing':
    case 'finished':
    case 'closed-early':
      return false;
  }
};
