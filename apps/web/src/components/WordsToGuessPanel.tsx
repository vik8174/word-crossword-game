import Typography from '@mui/material/Typography';

import type { GuessableWord, WordLocation } from '../rooms/word-visibility';
import { nameOf, type WordEntry } from './word-entry';
import { WordEntryList } from './WordEntryList';

/** Said over the words the others are explaining to this player. */
const GUESS_HINT =
  'The others explain these to you. Type them into the highlighted squares, and name one by its number to ask for it again. Tap one to go to its first empty square.';

interface WordsToGuessPanelProps {
  /** The words hidden from this player — they are the ones typing them in. */
  readonly words: readonly GuessableWord[];
  /**
   * Called with where the word behind a tapped entry runs, so the grid can take
   * the player to it.
   *
   * A location, exactly as the other half reports one. There is no spelling on
   * this side of the game to report even by mistake — a {@link GuessableWord}
   * does not carry one — and the two halves are alike here on purpose
   * (`docs/decisions/0016-the-cursor-lives-in-the-grid.md`).
   */
  readonly onSelectWord: (location: WordLocation) => void;
}

/**
 * The other half of this player's crossword: the words being explained to them,
 * by number and direction alone.
 *
 * Of these it holds a number, a direction and whether they have been answered —
 * no letter, and no length. Working the spelling out is their whole game.
 *
 * It also carries how far that game has got, which has nowhere else to live: the
 * board says how many squares are filled in, not how many words are done.
 *
 * @param props.words - The `toGuess` half of the `dealt` view {@link wordViewFor} worked out
 * @param props.onSelectWord - Called with where a tapped word runs
 *
 * @example
 * <WordsToGuessPanel words={view.toGuess} onSelectWord={goTo} />
 */
export const WordsToGuessPanel = ({ words, onSelectWord }: WordsToGuessPanelProps) => {
  const answered = words.filter((word) => word.isSolved).length;

  const entries: readonly WordEntry[] = words.map((word) => ({
    id: word.id,
    name: `${nameOf(word)}${word.isSolved ? ' — answered' : ' — still to answer'}`,
    location: { cells: word.cells, orientation: word.orientation },
    isSolved: word.isSolved,
  }));

  return (
    <section aria-labelledby="to-guess-heading">
      <Typography id="to-guess-heading" variant="subtitle1" component="h2">
        Yours to guess
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {GUESS_HINT}
      </Typography>

      <WordEntryList labelledBy="to-guess-heading" entries={entries} onSelectWord={onSelectWord} />

      <Typography variant="body2" role="status" sx={{ mt: 1 }}>
        {`${answered} of ${words.length} answered.`}
      </Typography>
    </section>
  );
};
