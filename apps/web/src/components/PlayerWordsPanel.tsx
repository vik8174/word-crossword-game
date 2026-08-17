import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import Typography from '@mui/material/Typography';
import type { WordOrientation } from 'shared';

import type { DealtWordView, ExplainedWord, GuessableWord } from '../rooms/word-visibility';

/** Said over the words this player explains out loud. */
const EXPLAIN_HINT =
  'These are written into the grid for you alone, in italics on the dashed squares. Explain each one out loud — say anything except the word itself. The ones already answered are crossed out. Tap one to find it in the grid.';

/** Said over the words the others are explaining to this player. */
const GUESS_HINT =
  'The others explain these to you. Type them into the highlighted squares, and name one by its number to ask for it again. Tap one to go to its first empty square.';

/** How a word is named out loud: its crossword number and the way it runs. */
const nameOf = (word: { readonly number: number; readonly orientation: WordOrientation }): string =>
  `${word.number} ${word.orientation}`;

interface PlayerWordsPanelProps {
  /** This player's half of the room's words — never anybody else's. */
  readonly view: DealtWordView;
  /**
   * Called with the word behind an entry the player tapped, so the grid can
   * take them to it. Both halves report the same way: where the word runs is
   * safe to hand over for a word this player guesses, since it is drawn in the
   * outlines of the squares already.
   */
  readonly onSelectWord: (word: ExplainedWord | GuessableWord) => void;
}

/**
 * The index to this player's crossword: which numbers are theirs to explain,
 * and which are theirs to guess.
 *
 * Not a word list — the grid holds the words now
 * (`docs/decisions/0015-explained-words-in-the-grid.md`). This is what lets the
 * players name a word to each other: "explain seven across again" instead of
 * describing which blank squares they mean. It also carries the progress of the
 * game, which has nowhere else to live, and it is the way through the crossword
 * for a reader who would otherwise rebuild it square by square.
 *
 * Of the words hidden from this player it holds a number, a direction and
 * whether they have been answered — no letter, and no length. Working the
 * spelling out is their whole game.
 *
 * Whether a word is done is said in words as well as struck through and
 * recoloured, so it does not rest on telling grey from black.
 *
 * It takes the one word view that holds words, so a player the deal never
 * covered cannot be rendered here by mistake — there is no such prop to pass.
 *
 * Every entry is a button, because for twenty words the grid is wider than a
 * phone and half the board is off screen: the numbers in the grid are there to
 * find a word once somebody names it, and this is what does the finding
 * (`docs/decisions/0016-the-cursor-lives-in-the-grid.md`).
 *
 * @param props.view - The `dealt` view {@link wordViewFor} worked out for this player
 * @param props.onSelectWord - Called with the word behind a tapped entry
 *
 * @example
 * <PlayerWordsPanel view={wordViewFor(room, viewerId)} onSelectWord={goTo} />
 */
export const PlayerWordsPanel = ({ view, onSelectWord }: PlayerWordsPanelProps) => {
  const answered = view.toGuess.filter((word) => word.isSolved).length;

  const entrySx = (isSolved: boolean) =>
    isSolved ? { textDecoration: 'line-through', color: 'text.secondary' } : undefined;

  // One unbroken line per word rather than a number in its own element: the
  // number, the direction and the state are read together, and a reader moving
  // through the list by line should never be handed half of one. That line is
  // also the button's whole name, so tapping it is offered in the same words.
  const entry = (word: ExplainedWord | GuessableWord, rest: string) => (
    <ListItem key={word.id} disableGutters disablePadding>
      <ListItemButton onClick={() => onSelectWord(word)} sx={{ py: 0.25, px: 0.5 }}>
        <Typography variant="body2" sx={entrySx(word.isSolved)}>
          {`${nameOf(word)}${rest}`}
        </Typography>
      </ListItemButton>
    </ListItem>
  );

  return (
    <section aria-labelledby="your-words-heading">
      <Typography id="your-words-heading" variant="h6" component="h2">
        Your words
      </Typography>

      <Typography id="to-explain-heading" variant="subtitle2" component="h3" sx={{ mt: 1 }}>
        Yours to explain
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {EXPLAIN_HINT}
      </Typography>
      <List dense disablePadding aria-labelledby="to-explain-heading" sx={{ mb: 1 }}>
        {view.toExplain.map((word) =>
          entry(word, ` — ${word.word}${word.isSolved ? ' — answered' : ''}`),
        )}
      </List>

      <Typography id="to-guess-heading" variant="subtitle2" component="h3">
        Yours to guess
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {GUESS_HINT}
      </Typography>
      <List dense disablePadding aria-labelledby="to-guess-heading">
        {view.toGuess.map((word) =>
          entry(word, word.isSolved ? ' — answered' : ' — still to answer'),
        )}
      </List>

      <Typography variant="body2" role="status" sx={{ mt: 1 }}>
        {`${answered} of ${view.toGuess.length} answered.`}
      </Typography>
    </section>
  );
};
