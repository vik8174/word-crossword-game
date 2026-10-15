import Box from '@mui/material/Box';

import type { GuessableWord, WordLocation } from '../rooms/word-visibility';
import { inRem } from '../scale';
import { STREET } from '../street';
import { gateHintSx } from './gate-panel-styles';
import { lobbyHeadingSx } from './lobby-styles';
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
  /**
   * What the answered words spell, by word id, read off the board they are on.
   *
   * An answered word is in everybody's grid, so showing it here gives nothing
   * away; a word that is not in this map is shown as its blanks and nothing more.
   */
  readonly spellings?: ReadonlyMap<string, string>;
}

/**
 * The other half of this player's crossword: the words being explained to them,
 * by number and direction alone.
 *
 * Of these it shows a number, a direction, how many letters the word has as
 * that many blanks (`state-tree.html`'s `.slots`), and whether it has been
 * answered, with the word itself from then on. The blanks do not follow the
 * letters being typed: those live in the grid. Working the spelling out is
 * their whole game.
 *
 * It also carries how far that game has got, which has nowhere else to live: the
 * board says how many squares are filled in, not how many words are done.
 *
 * @param props.words - The `toGuess` half of the `dealt` view {@link wordViewFor} worked out
 * @param props.onSelectWord - Called with where a tapped word runs
 * @param props.spellings - The answered words as the board spells them
 *
 * @example
 * <WordsToGuessPanel words={view.toGuess} onSelectWord={goTo} />
 */
export const WordsToGuessPanel = ({ words, onSelectWord, spellings }: WordsToGuessPanelProps) => {
  const answered = words.filter((word) => word.isSolved).length;

  const entries: readonly WordEntry[] = words.map((word) => ({
    id: word.id,
    reference: nameOf(word),
    shown: (word.isSolved ? spellings?.get(word.id) : undefined) ?? '_'.repeat(word.cells.length),
    look: 'slots',
    name: `${nameOf(word)}, ${word.cells.length} letters${word.isSolved ? ', answered' : ', still to answer'}`,
    location: { cells: word.cells, orientation: word.orientation },
    isSolved: word.isSolved,
  }));

  return (
    <section aria-labelledby="to-guess-heading">
      <Box component="h2" id="to-guess-heading" sx={lobbyHeadingSx}>
        You guess
      </Box>
      <Box component="p" sx={gateHintSx}>
        {GUESS_HINT}
      </Box>

      <WordEntryList labelledBy="to-guess-heading" entries={entries} onSelectWord={onSelectWord} />

      <Box
        component="p"
        role="status"
        sx={{ margin: `${inRem(10)} 0 0`, fontSize: inRem(16), color: STREET.slate }}
      >
        {`${answered} of ${words.length} answered.`}
      </Box>
    </section>
  );
};
