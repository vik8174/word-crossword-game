import type { RoomDocumentShape } from './room-document';

/**
 * Who may do what in a room, decided from the room document alone.
 *
 * Pure and free of the Firestore SDK — it only needs to read milliseconds off a
 * timestamp — so the rules a player is judged by can be tested without a
 * database. The security rules enforce the same limits server-side; this module
 * is what lets the UI explain a refusal instead of showing one.
 */

/** Most players a room holds. Mirrors the limit `firestore.rules` enforces. */
export const MAX_PLAYERS = 4;

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
 * - `full` — four players are already in
 * - `expired` — the room outlived its 24 hours; Firestore has not collected it
 *   yet, but every write to it is refused, so there is no game left to join
 */
export type RoomAccess = 'joined' | 'joinable' | 'full' | 'expired';

/**
 * What the given player may do with the given room right now.
 *
 * Expiry is checked first: a room past `expiresAt` rejects every update, so
 * even a player already listed in it has nothing left to play.
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
