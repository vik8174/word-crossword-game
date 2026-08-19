import type { RoomDocumentShape } from './room-document';

/**
 * Who may do what in a room, decided from the room document alone.
 *
 * Pure and free of the Firestore SDK — it only needs to read milliseconds off a
 * timestamp — so the rules a player is judged by can be tested without a
 * database. The security rules enforce the same limits server-side; this module
 * is what lets the UI explain a refusal instead of showing one.
 */

/**
 * Most players a room holds — and, since `MIN_PLAYERS` is the same number, the
 * only size this game is played at.
 *
 * Mirrored by the `players.size() <= 2` literal in `hasRoomForPlayers`
 * (`firestore.rules`), which is the gate that actually holds: `joinRoom` writes
 * `players.<uid>` without re-reading the room, so the rules are the only thing
 * standing between two clients pressing Join at once and a third seat. Rules
 * cannot import this, so the two move together by hand — the same convention
 * the floor already follows.
 */
export const MAX_PLAYERS = 2;

/** All this module needs of a timestamp — Firestore's `Timestamp` satisfies it. */
export interface MillisecondTimestamp {
  toMillis(): number;
}

/** A room as this module reads it: any timestamp that can name its moment. */
export type ReadableRoom = RoomDocumentShape<MillisecondTimestamp>;

/**
 * What a player may do with the room they just opened:
 * - `joined` — they are already in it and see the game
 * - `joinable` — there is a free seat and they may enter a nickname
 * - `started` — the words have been dealt out; the room takes nobody else
 * - `finished` — the room is closed for good; its game is over
 * - `full` — both players are already in
 * - `expired` — the room outlived its 24 hours; Firestore has not collected it
 *   yet, but every write to it is refused, so there is no game left to join
 */
export type RoomAccess = 'joined' | 'joinable' | 'started' | 'finished' | 'full' | 'expired';

/**
 * What the given player may do with the given room right now.
 *
 * The order of the checks is the point. Expiry comes first: a room past
 * `expiresAt` rejects every update, so even a player already listed in it has
 * nothing left to play. Being in the room comes next, so nothing that follows
 * can lock out somebody who is already playing — a player reopening their own
 * link mid-game is exactly what has to keep working.
 *
 * A newcomer is turned away once the game has started, and not only because
 * there would be nothing for them to guess: every word of a started room is
 * hidden from one of the players who were in at the deal, so a latecomer joining
 * would be handed the whole word list to "explain" (see
 * `docs/decisions/0010-letterless-grid-and-private-word-list.md`). The security
 * rules refuse the same write.
 *
 * A closed room turns them away too, but it is told apart from one still being
 * played: the door is shut for the same reason, and yet "come back later" and
 * "there is nothing to come back to" are not the same news
 * (`docs/decisions/0012-ending-a-game-from-the-received-state.md`). The rules
 * know nothing of the difference and do not need to — both writes are refused
 * by the one condition that a started room takes no new player.
 *
 * This one reads `status` and not the board, unlike everything that reveals a
 * word: `completed` is terminal in the rules, so a room carrying it is shut to
 * newcomers whether or not its crossword was ever filled in, and what is said
 * to them claims no more than that.
 *
 * @param room - The room document as read from Firestore
 * @param playerId - Firebase Auth UID of the player who opened the link
 * @param now - The moment to judge expiry against
 * @returns How this player stands towards this room
 *
 * @example
 * roomAccessFor(room, 'uid', new Date()); // 'joinable'
 */
export const roomAccessFor = (room: ReadableRoom, playerId: string, now: Date): RoomAccess => {
  if (room.expiresAt.toMillis() <= now.getTime()) {
    return 'expired';
  }

  if (Object.hasOwn(room.players, playerId)) {
    return 'joined';
  }

  if (room.status === 'completed') {
    return 'finished';
  }

  if (room.status !== 'lobby') {
    return 'started';
  }

  return Object.keys(room.players).length >= MAX_PLAYERS ? 'full' : 'joinable';
};

/** A player as the player list shows them. */
export interface RoomPlayerEntry {
  /** Firebase Auth UID — the key this player has in the room's `players` map. */
  readonly id: string;
  readonly nickname: string;
}

/**
 * Players of the room, oldest first.
 *
 * The order is the one everyone sees, so it must not depend on how Firestore
 * happens to hand back the map: players who joined within the same millisecond
 * are ordered by their UID rather than left to chance.
 *
 * @param room - The room document as read from Firestore
 * @returns Players in the order they joined
 */
export const playersInJoinOrder = (room: ReadableRoom): readonly RoomPlayerEntry[] =>
  Object.entries(room.players)
    .sort(
      ([idA, playerA], [idB, playerB]) =>
        playerA.joinedAt.toMillis() - playerB.joinedAt.toMillis() || idA.localeCompare(idB),
    )
    .map(([id, player]) => ({ id, nickname: player.nickname }));
