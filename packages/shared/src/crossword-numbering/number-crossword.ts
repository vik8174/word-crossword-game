import type { GridPosition, PlacedWord } from '../crossword-generator';

/**
 * The numbers a crossword prints beside its words, worked out from the grid.
 *
 * This is the shared language of the game: the words are explained out loud, so
 * two players looking at the same board need a way to say which one they mean —
 * "four down", not "the six-letter one going down on the right".
 */

/** A placed word and the number the crossword gives it. */
export interface NumberedWord {
  /**
   * Position of the word in `layout.placedWords`, which is how the rest of the
   * app names a word (see `wordIdAt`). Carried so a caller can pair a number
   * with a word it already holds instead of matching on squares.
   */
  readonly wordIndex: number;
  /** The number itself, counted from one. */
  readonly number: number;
  /** The square the number is printed in: the first square of the word. */
  readonly start: GridPosition;
}

/** How a starting square is recognised as one already numbered. */
const startKey = ({ row, col }: GridPosition): string => `${row}:${col}`;

/** Where one word begins, before it is known what number that square carries. */
interface WordStart {
  readonly wordIndex: number;
  readonly start: GridPosition;
}

/** A word paired with the square it starts in; words occupying none are dropped. */
const startsOf = (placedWords: readonly PlacedWord[]): WordStart[] =>
  placedWords.flatMap((placed, wordIndex) => {
    const start = placed.cells[0];

    return start === undefined ? [] : [{ wordIndex, start }];
  });

/**
 * Numbers the words of a crossword the way a crossword is numbered.
 *
 * A number belongs to a square, not to a word: it marks a square where a word
 * begins, squares are numbered from one going down the grid and then across it,
 * and a square where an across word and a down word both begin carries a single
 * number for the two of them. That is the convention every printed crossword
 * follows, and following it is the point — the numbers exist so that players can
 * name a word to each other without explaining what they mean by the name.
 *
 * **Derived, never stored.** The layout is fixed when the room is created and
 * never changes afterwards, so this is a function of something already on every
 * screen: every player computes the same numbers from the same layout, and
 * writing them down would only create a second copy of a fact that cannot drift.
 *
 * A word occupying no square at all starts nowhere and is left out. The
 * generator produces no such word, but a layout is read back out of a document
 * another client wrote, and one malformed word must not cost the grid its
 * numbering.
 *
 * @param placedWords - The words of the layout, in the order the layout holds them
 * @returns Each word that has a square, with its number, in numbering order
 *
 * @example
 * numberCrossword(layout.placedWords);
 * // [{ wordIndex: 0, number: 1, start: { row: 0, col: 0 } }, ...]
 */
export const numberCrossword = (placedWords: readonly PlacedWord[]): readonly NumberedWord[] => {
  // Down the grid and then across it, which is the order the numbers run in.
  // The sort is stable, so two words beginning in the same square stay in the
  // order the layout holds them.
  const inReadingOrder = startsOf(placedWords).sort(
    (left, right) => left.start.row - right.start.row || left.start.col - right.start.col,
  );

  const numbers = new Map<string, number>();
  const numbered: NumberedWord[] = [];

  for (const { wordIndex, start } of inReadingOrder) {
    const key = startKey(start);
    const number = numbers.get(key) ?? numbers.size + 1;

    numbers.set(key, number);
    numbered.push({ wordIndex, number, start });
  }

  return numbered;
};
