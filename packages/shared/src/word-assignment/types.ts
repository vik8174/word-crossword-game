/**
 * Public contract of the `word-assignment` module.
 *
 * Nothing here knows how a room is stored: the assignment is expressed by word
 * position, and translating that into the document's `words` map is the web
 * app's job (`wordIdAt` in `apps/web/src/rooms/room-document.ts`).
 */

/** Fewest players a game can be assigned to — a hidden word needs someone left to explain it. */
export const MIN_PLAYERS = 2;

/**
 * Why a room's words cannot be dealt out as it stands:
 * - `too-few-players` — one player has nobody to explain anything to them
 * - `fewer-words-than-players` — somebody would end up with no word to guess,
 *   which is not a smaller share of the game but no game at all
 */
export type WordAssignmentRefusal = 'too-few-players' | 'fewer-words-than-players';

/** As much of a room as deciding whether it can be dealt out takes. */
export interface RoomSize {
  readonly wordCount: number;
  readonly playerCount: number;
}

/** Source of randomness: returns a number in `[0, 1)`, exactly like `Math.random`. */
export type RandomSource = () => number;

/**
 * Who has to guess which word, by position.
 *
 * Entry `i` is the id of the player the word at position `i` is hidden from —
 * the same position the word has in the list handed to the assignment.
 */
export type WordAssignment = readonly string[];

/** Everything the assignment is decided from. */
export interface WordAssignmentInput {
  /** How many words the crossword holds. Their spelling does not matter here. */
  readonly wordCount: number;
  /** Ids of the players in the room, in any order. */
  readonly playerIds: readonly string[];
  /** Where the draw comes from; injected so a test can decide it. */
  readonly random?: RandomSource;
}
