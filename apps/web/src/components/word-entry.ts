import type { WordOrientation } from 'shared';

import type { WordLocation } from '../rooms/word-visibility';

/**
 * One line of an index: a word as it is named out loud, and where it runs.
 *
 * It carries a location and no spelling, which is what makes the leak
 * impossible rather than merely unlikely: the panel on the left of the board
 * holds words this player reads, the one on the right holds words hidden from
 * them, and neither has anything but this to hand its list
 * (`docs/decisions/0016-the-cursor-lives-in-the-grid.md`). A word that reads as
 * text does so inside {@link WordEntry.name}, which the panel that owns it
 * builds and nothing downstream takes apart.
 */
export interface WordEntry {
  /** Key of the word in the room's `words` map — stable across renders and updates. */
  readonly id: string;
  /**
   * The whole line, in the words it is read in: its crossword number, the way it
   * runs, and whatever else this half of the game may say about it.
   */
  readonly name: string;
  /** Where the word runs, for taking the player to it. */
  readonly location: WordLocation;
  /** `true` once it has been answered — struck through as well as said. */
  readonly isSolved: boolean;
}

/**
 * How a word is named out loud: its crossword number and the way it runs.
 *
 * Both halves of the game name a word the same way, because naming one is what
 * the players do to each other across the table — "seven across" has to mean the
 * same thing said by either of them.
 *
 * @param word - Anything the crossword has numbered
 * @returns The name, as it is said and as it is read
 *
 * @example
 * nameOf({ number: 7, orientation: 'across' }); // '7 across'
 */
export const nameOf = (word: {
  readonly number: number;
  readonly orientation: WordOrientation;
}): string => `${word.number} ${word.orientation}`;
