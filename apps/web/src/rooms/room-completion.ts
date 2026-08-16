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
 */

/**
 * The update that closes a game.
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
 * @param room - The room document as read from Firestore
 * @returns `true` when the room is closed and its board really is full
 *
 * @example
 * isGameFinished(room); // true — safe to spell the crossword out
 */
export const isGameFinished = (room: ReadableRoom): boolean =>
  room.status === 'completed' && isEveryWordGuessed(room);
