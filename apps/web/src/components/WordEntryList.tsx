import Box from '@mui/material/Box';
import type { CSSObject } from '@mui/material/styles';

import { MOTION_MS } from '../motion';
import type { WordLocation } from '../rooms/word-visibility';
import { inRem, TEXT_FONT_FAMILY } from '../scale';
import { STREET } from '../street';
import type { WordEntry } from './word-entry';
import { REFERENCE_SX, ROW_LAYOUT_SX, stateSx, WORD_END_SX, WORD_RULE } from './word-row-styles';

interface WordEntryListProps {
  /** Id of the heading this list belongs to, so it is named by its own half. */
  readonly labelledBy: string;
  /** The words of this half of the game, in the order the crossword numbers them. */
  readonly entries: readonly WordEntry[];
  /**
   * Called with where the word behind a tapped entry runs, so the grid can take
   * the player to it.
   *
   * Only a location ever leaves, never a word — see {@link WordEntry}.
   */
  readonly onSelectWord: (location: WordLocation) => void;
}

/** One row, drawn as `.word-list button` is (template line 192): a row of three tracks. */
const ROW_SX: CSSObject = {
  ...ROW_LAYOUT_SX,
  cursor: 'pointer',
  background: 'none',
  border: 0,
  '&:focus-visible': { outline: `3px solid ${STREET.ochre}`, outlineOffset: '-3px' },
  // The row's wash on hover (template lines 357-358), 200ms on `ease`, and only
  // where the setting allows movement: with reduced motion the row is the same
  // on hover as at rest.
  '@media (prefers-reduced-motion: no-preference)': {
    transition: `background-color ${MOTION_MS.row}ms ease`,
    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.5)' },
  },
};

/**
 * The list under one of the two headings: every word of that half, each one a
 * button that goes to it.
 *
 * Every entry is a button because for twenty words the grid can be wider than
 * the zone it is drawn in and part of the board out of view: the numbers in the
 * grid are there to find a word once somebody names it, and this is what does
 * the finding (`docs/decisions/0016-the-cursor-lives-in-the-grid.md`).
 *
 * A row draws in three tracks, reference, word and state, and the button's
 * accessible name stays {@link WordEntry.name}, the whole sentence, so a reader
 * moving through the list by line is handed what a sighted player reads across
 * three columns, never half of it (issue #150). A word that is done says so in
 * its state ("answered", behind a tick), in its name, and in the squares of the
 * grid, so it never rests on telling one colour from another.
 *
 * @param props.labelledBy - Id of the heading naming this half of the game
 * @param props.entries - The words of that half
 * @param props.onSelectWord - Called with where a tapped word runs
 *
 * @example
 * <WordEntryList labelledBy="to-guess-heading" entries={entries} onSelectWord={goTo} />
 */
export const WordEntryList = ({ labelledBy, entries, onSelectWord }: WordEntryListProps) => (
  <Box
    component="ul"
    aria-labelledby={labelledBy}
    sx={{ listStyle: 'none', margin: `${inRem(10)} 0 0`, padding: 0 }}
  >
    {entries.map((entry) => (
      <Box
        component="li"
        key={entry.id}
        sx={{ borderTop: WORD_RULE, '&:last-child': { borderBottom: WORD_RULE } }}
      >
        <Box
          component="button"
          type="button"
          onClick={() => onSelectWord(entry.location)}
          aria-label={entry.name}
          sx={ROW_SX}
        >
          <Box component="span" sx={REFERENCE_SX}>
            {entry.reference}
          </Box>

          <Box
            component="span"
            sx={{
              ...WORD_END_SX,
              minWidth: 0,
              fontFamily: TEXT_FONT_FAMILY,
              overflowWrap: 'anywhere',
              ...(entry.look === 'word'
                ? { fontStyle: 'italic', fontSize: inRem(22) }
                : { letterSpacing: '0.2em', fontSize: inRem(20) }),
            }}
          >
            {entry.shown}
          </Box>

          <Box component="span" aria-hidden="true" sx={stateSx(entry.isSolved)}>
            {entry.isSolved ? '✓ answered' : ''}
          </Box>
        </Box>
      </Box>
    ))}
  </Box>
);
