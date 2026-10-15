import { answeredSpellings } from './answered-spellings';
import type { GridView, PlayerWordView } from './word-visibility';

/**
 * Every word the group has answered, as this player may read it, in the order
 * the board numbers them: the ones they explained and the ones they guessed.
 *
 * They are the cards hanging on the line between the balconies. A word this
 * player guessed is spelled from the squares they were answered into
 * ({@link answeredSpellings}), and one they explained is theirs already, so
 * nothing is named that the grid does not already show. A player the deal left
 * out has no words of their own and so no cards.
 *
 * @param wordView - Which words this player was dealt
 * @param gridView - The board as this player may see it
 * @returns The answered words, by their number on the board
 *
 * @example
 * answeredWordsOf(wordViewFor(room, uid), gridViewFor(room, uid)); // ['bread', 'apple']
 */
export const answeredWordsOf = (
  wordView: PlayerWordView,
  gridView: GridView,
): readonly string[] => {
  if (wordView.kind !== 'dealt') {
    return [];
  }

  const spellings = answeredSpellings(gridView, wordView.toGuess);

  return [
    ...wordView.toExplain
      .filter((word) => word.isSolved)
      .map((word) => ({ number: word.number, word: word.word })),
    ...wordView.toGuess.flatMap((word) => {
      const spelling = spellings.get(word.id);

      // The grid spells in capitals and the line does not: the cards are written
      // as the words are, as the ones this player explained already are.
      return spelling === undefined ? [] : [{ number: word.number, word: spelling.toLowerCase() }];
    }),
  ]
    .sort((one, other) => one.number - other.number)
    .map((entry) => entry.word);
};
