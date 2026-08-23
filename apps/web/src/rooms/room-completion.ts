import type { ReadableRoom } from './room-access';
import { buildRoomUpdate, isWordSolved, type RoomUpdate, wordIdAt } from './room-document';

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
 *
 * A game also ends the other way, and that one is a decision rather than a
 * reading: a player who cannot finish the crossword ends it, and the room takes
 * `status: 'closed'` instead. That value *does* depend on who wrote it, which
 * is why the security rules refuse to move a room out of either ending — the
 * two writes can meet in the same second, and only one of them may land
 * (`docs/decisions/0027-a-game-a-player-can-end.md`).
 */

/**
 * The update that ends a game whose crossword was filled in.
 *
 * `status: 'completed'` is the whole of it, and it is the same value from
 * whichever client writes it — which is what makes several of them writing it
 * within the same second harmless. The expiry that travels with it (see
 * {@link buildRoomUpdate}) differs between those clients by milliseconds, and
 * the last one to land wins by the same margin.
 *
 * @param now - The moment the game was closed; the room's new expiry follows from it
 * @returns Field and value for a single `updateDoc` call
 *
 * @example
 * buildCompletionUpdate(new Date());
 */
export const buildCompletionUpdate = (now: Date): RoomUpdate =>
  buildRoomUpdate({ status: 'completed' }, now);

/**
 * The update that ends a game before its crossword was filled in.
 *
 * The neighbour of {@link buildCompletionUpdate}, and a different value on
 * purpose: this room's crossword was not finished, and a document saying
 * `completed` about it would be describing a game that did not happen. What
 * follows from the difference is the whole of the screen a closed room shows.
 *
 * Unlike its neighbour this value is not one every client would arrive at on
 * its own — one player pressed a button — so two of them writing different
 * endings in the same second is a real possibility, and the security rules
 * settle it by refusing to move a room out of the ending that landed first
 * (`docs/decisions/0027-a-game-a-player-can-end.md`).
 *
 * @param now - The moment the game was ended; the room's new expiry follows from it
 * @returns Field and value for a single `updateDoc` call
 *
 * @example
 * buildEarlyEndUpdate(new Date());
 */
export const buildEarlyEndUpdate = (now: Date): RoomUpdate =>
  buildRoomUpdate({ status: 'closed' }, now);

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
 * itself is {@link buildCompletionUpdate}.
 *
 * @param room - The room document as read from Firestore
 * @returns `true` when the board is full and the status has yet to catch up
 *
 * @example
 * if (awaitsCompletion(room)) await completeGame(roomId);
 */
export const awaitsCompletion = (room: ReadableRoom): boolean =>
  room.status === 'playing' && isEveryWordGuessed(room);

/**
 * Whether this room really did finish its crossword.
 *
 * Both halves are needed, and the second is the one that is easy to forget.
 * `status` is written by a client and the security rules cannot check it
 * against the `words` map — they cannot walk it (see
 * `docs/decisions/0009-room-document-schema.md`), so nothing stops any client
 * that knows the room id from writing `completed` over a lobby. A screen that
 * showed the crossword on the strength of that field alone would hand the whole
 * word list to whoever asked, which is why anything that reveals words asks
 * this rather than reading the status.
 *
 * The status is still half the answer: `completed` is terminal in the rules, so
 * a room carrying it is closed whether or not its grid was ever filled.
 *
 * The other terminal status answers `false` here, and by the same rule rather
 * than by a case of its own: a room whose players ended it says `closed`, which
 * is not `completed`. It reads that way even in the one room where the board
 * happens to be full — a last answer and an ending pressed in the same second,
 * with the ending landing first. The document says the game was ended, so that
 * is what the screen says too.
 *
 * @param room - The room document as read from Firestore
 * @returns `true` when the room is closed and its board really is full
 *
 * @example
 * isGameFinished(room); // true — safe to spell the crossword out
 */
export const isGameFinished = (room: ReadableRoom): boolean =>
  room.status === 'completed' && isEveryWordGuessed(room);
