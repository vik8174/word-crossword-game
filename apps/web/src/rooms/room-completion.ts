import type { ReadableRoom } from './room-access';
import { isWordSolved, wordIdAt } from './room-document';

/**
 * When a game is over, and who says so.
 *
 * The end of a game is read off the room as it arrives, never inferred from
 * the answer a client has just sent. Two players can answer the last two words
 * within the same second: each of them, looking at their own snapshot, still
 * sees a word open — somebody else's — so neither would ever call the game
 * finished, both answers would land, and a full grid would sit in `playing`
 * for good. Nobody was last at the moment they decided.
 *
 * So the question asked here is only ever about the received state: does this
 * board show every word answered, and does the document still not say so. Any
 * client that can see that writes the same `status: 'completed'`, which is why
 * several of them doing it at once is harmless — the value does not depend on
 * who wrote it (see `docs/decisions/0012-ending-a-game-from-the-received-state.md`).
 */

/** The one field a finished game changes. Identical from whichever client writes it. */
export const COMPLETION_UPDATE: Readonly<Record<string, unknown>> = { status: 'completed' };

/**
 * Whether every word of the crossword has been answered.
 *
 * Counted over `layout.placedWords`, which is what the room was built from and
 * never changes, rather than over the `words` map another client could have
 * written extra keys into. A word with no state, or with a state that names
 * nobody, is an open word — see {@link isWordSolved}.
 *
 * @param room - The room document as read from Firestore
 * @returns `true` when no word of the grid is left open
 *
 * @example
 * isEveryWordGuessed(room); // true
 */
export const isEveryWordGuessed = (room: ReadableRoom): boolean =>
  room.layout.placedWords.every((_placed, index) => isWordSolved(room.words[wordIdAt(index)]));

/**
 * Whether this room is finished but does not say so yet.
 *
 * A room in the lobby has nothing answered and a room already `completed` has
 * nothing left to write, so only a game in progress can ask for this. The write
 * itself is {@link COMPLETION_UPDATE}.
 *
 * @param room - The room document as read from Firestore
 * @returns `true` when the board is full and the status has yet to catch up
 *
 * @example
 * if (awaitsCompletion(room)) await completeGame(roomId);
 */
export const awaitsCompletion = (room: ReadableRoom): boolean =>
  room.status === 'playing' && isEveryWordGuessed(room);
