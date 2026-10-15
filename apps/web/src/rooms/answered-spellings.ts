import { cellKey, type GridView, type GuessableWord } from './word-visibility';

/**
 * How the words this player guessed are spelled, read off the board they are
 * answered on.
 *
 * Only a word that has been answered has a spelling here, and only one that
 * every square of which holds a letter the group has answered. That is the
 * same letters everybody's grid already shows, so putting them in the list of
 * words to guess gives nothing away; a word still open has no entry, and the
 * list shows its blanks. {@link GuessableWord} carries no spelling by design
 * (`docs/decisions/0011-typing-guesses-into-the-grid.md`), which is why this
 * reads the grid and not the word.
 *
 * @param view - The board as this player may see it
 * @param words - The words hidden from this player
 * @returns The spelling of each answered word, by word id
 *
 * @example
 * answeredSpellings(gridView, wordView.toGuess).get('w1'); // 'apple'
 */
export const answeredSpellings = (
  view: GridView,
  words: readonly GuessableWord[],
): ReadonlyMap<string, string> => {
  const letters = new Map(
    view.cells.flatMap((cell) =>
      cell.content.kind === 'solved' ? [[cellKey(cell), cell.content.letter] as const] : [],
    ),
  );
  const spellings = new Map<string, string>();

  for (const word of words) {
    const spelling = word.cells.map((position) => letters.get(cellKey(position)));

    if (word.isSolved && spelling.every((letter) => letter !== undefined)) {
      spellings.set(word.id, spelling.join(''));
    }
  }

  return spellings;
};
