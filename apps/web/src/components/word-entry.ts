import type { WordOrientation } from 'shared';

import type { WordLocation } from '../rooms/word-visibility';

/**
 * One line of an index: a word as it is named out loud, and where it runs.
 *
 * It carries a location and no spelling on the side of the game that has none
 * to give — the panel on the left of the board holds words this player reads,
 * the one on the right holds words hidden from them, and neither hands its
 * list anything but this
 * (`docs/decisions/0016-the-cursor-lives-in-the-grid.md`). A word that reads as
 * text does so inside {@link WordEntry.word}, which the panel that owns it
 * builds and nothing downstream takes apart.
 *
 * {@link WordEntry.reference} and {@link WordEntry.word} are what the row
 * draws in its two visual tracks; {@link WordEntry.name} is the whole sentence
 * behind them, including whether the word has been answered, and is never
 * drawn — it is the row's accessible name and nothing else reads it. The two
 * are kept apart because the row's third track, the mark, says "answered" to
 * the eye and not out loud (issue #150).
 */
export interface WordEntry {
  /** Key of the word in the room's `words` map — stable across renders and updates. */
  readonly id: string;
  /**
   * The crossword number and the way the word runs, exactly as {@link nameOf}
   * says it — the row's fixed-width track.
   */
  readonly reference: string;
  /**
   * The word itself, where this half of the game has one to show — `null` on
   * the side that guesses, which has nothing to write here without handing the
   * spelling away.
   */
  readonly word: string | null;
  /**
   * The whole line, in the words it is read in: its crossword number, the way
   * it runs, the word if this half has one, and whether it has been answered.
   * Never drawn on screen — see {@link WordEntry}.
   */
  readonly name: string;
  /** Where the word runs, for taking the player to it. */
  readonly location: WordLocation;
  /** `true` once it has been answered — marked, struck through and said. */
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
