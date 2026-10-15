import Box from '@mui/material/Box';

import type { ExplainedWord, WordLocation } from '../rooms/word-visibility';
import { gateHintSx } from './gate-panel-styles';
import { lobbyHeadingSx } from './lobby-styles';
import { nameOf, type WordEntry } from './word-entry';
import { WordEntryList } from './WordEntryList';

/** Said over the words this player explains out loud. */
const EXPLAIN_HINT =
  'These are written into the grid for you alone, in italics on the dashed squares. Explain each one out loud: say anything except the word itself. Tap one to find it in the grid.';

interface WordsToExplainPanelProps {
  /** The words hidden from the other player — this one reads them and says them. */
  readonly words: readonly ExplainedWord[];
  /**
   * Called with where the word behind a tapped entry runs, so the grid can take
   * the player to it.
   *
   * Only a location leaves this panel, never a word — and this is the half where
   * that matters most, since it is the half that has words to leak. Where a word
   * sits is drawn in the outlines of the squares already; what it says is this
   * player's own to give away out loud and nothing else's to pass on
   * (`docs/decisions/0016-the-cursor-lives-in-the-grid.md`).
   */
  readonly onSelectWord: (location: WordLocation) => void;
}

/**
 * This player's half of the secret: the words they explain, spelled out for
 * them alone.
 *
 * It is one of the two halves that used to be a single panel, split because
 * they belong on opposite sides of the board — what this player gives the other
 * one on the left, what they get back on the right (issue #101). Splitting them
 * changed nothing about what leaves either: a location, and never a word.
 *
 * Not a word list so much as an index — the grid holds the words now
 * (`docs/decisions/0015-explained-words-in-the-grid.md`). What this adds is a
 * way to name one out loud, "explain seven across again" rather than a
 * description of which squares are meant, and a way to get to it. It is drawn
 * as the template's `You explain` block (`state-tree.html`, `wordRows`).
 *
 * @param props.words - The `toExplain` half of the `dealt` view {@link wordViewFor} worked out
 * @param props.onSelectWord - Called with where a tapped word runs
 *
 * @example
 * <WordsToExplainPanel words={view.toExplain} onSelectWord={goTo} />
 */
export const WordsToExplainPanel = ({ words, onSelectWord }: WordsToExplainPanelProps) => {
  const entries: readonly WordEntry[] = words.map((word) => ({
    id: word.id,
    reference: nameOf(word),
    shown: word.word,
    look: 'word',
    name: `${nameOf(word)}, ${word.word}${word.isSolved ? ', answered' : ''}`,
    location: { cells: word.cells, orientation: word.orientation },
    isSolved: word.isSolved,
  }));

  return (
    <section aria-labelledby="to-explain-heading">
      <Box component="h2" id="to-explain-heading" sx={lobbyHeadingSx}>
        You explain
      </Box>
      <Box component="p" sx={gateHintSx}>
        {EXPLAIN_HINT}
      </Box>

      <WordEntryList
        labelledBy="to-explain-heading"
        entries={entries}
        onSelectWord={onSelectWord}
      />
    </section>
  );
};
