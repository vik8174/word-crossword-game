import type { ReadableRoom } from './room-access';
import { wordIdAt } from './room-document';

/**
 * What one player may see of a room's words.
 *
 * The room document carries every word in plain text and every client fetches
 * all of it (see `docs/decisions/0004-ui-only-word-visibility.md`), so this
 * module is the line between what a player is allowed to see and what would
 * spoil their game. Nothing outside it should reach for `layout.placedWords`
 * when a player is looking.
 */

/** A word the viewer can see, and must explain to the others without saying it. */
export interface ExplainedWord {
  /** Key of the word in the room's `words` map — stable across renders and updates. */
  readonly id: string;
  readonly word: string;
}

/** The words of a room as they stand for one player. */
export interface PlayerWordView {
  /** Words hidden from someone else: this player sees them and explains them. */
  readonly toExplain: readonly ExplainedWord[];
  /**
   * How many words are hidden from this player. Deliberately a count and not a
   * list: their spelling is exactly what the player is here to work out.
   */
  readonly toGuessCount: number;
}

/**
 * Splits a room's words into the ones this player explains and the ones they guess.
 *
 * A word counts as neither until it has been assigned, so a room still in the
 * lobby shows nobody anything. A word assigned to a player who is not in the
 * room — nothing in the security rules prevents another client from writing
 * that — reads as somebody else's word to guess, and is therefore spelled out
 * to everybody, including whoever was meant to guess it. That is the trust
 * boundary `docs/decisions/0004-ui-only-word-visibility.md` accepts: a client
 * already in the room can spoil the game for the room it is in, and no reading
 * of the document can tell that write apart from an honest one.
 *
 * @param room - The room document as read from Firestore
 * @param viewerId - Firebase Auth UID of the player looking at the screen
 * @returns The words they explain, and how many they have to guess
 *
 * @example
 * wordViewFor(room, playerId); // { toExplain: [{ id: 'w1', word: 'apple' }], toGuessCount: 2 }
 */
export const wordViewFor = (room: ReadableRoom, viewerId: string): PlayerWordView => {
  const assigned = room.layout.placedWords
    .map((placedWord, index) => {
      const id = wordIdAt(index);

      return { id, word: placedWord.word, hiddenFrom: room.words[id]?.hiddenFromPlayerId };
    })
    .filter((entry) => typeof entry.hiddenFrom === 'string');

  return {
    toExplain: assigned
      .filter((entry) => entry.hiddenFrom !== viewerId)
      .map(({ id, word }) => ({ id, word })),
    toGuessCount: assigned.filter((entry) => entry.hiddenFrom === viewerId).length,
  };
};
