import Box from '@mui/material/Box';
import type { CSSObject } from '@mui/material/styles';

import type { WordLocation } from '../rooms/word-visibility';
import { inRem, TEXT_FONT_FAMILY, WEIGHTS } from '../scale';
import { STREET } from '../street';
import { OUTLINE_WIDTH } from './surface-styles';
import type { WordEntry } from './word-entry';

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

/** A hairline between rows, and under the last: `.word-list li` (template line 181). */
const RULE = `${OUTLINE_WIDTH}px solid ${STREET.line}`;

/**
 * Width of the reference track: the template's own 74px (`.word-list .ref`, line
 * 183), in `rem`. It holds `18 across`, the longest name a game of 20 words
 * has, with room to spare, so every word in a list starts at the same point.
 */
const REFERENCE_TRACK_WIDTH = inRem(74);

/** One row, drawn as `.word-list button` is (template line 182): a row of three tracks. */
const ROW_SX: CSSObject = {
  display: 'flex',
  alignItems: 'baseline',
  gap: inRem(12),
  width: '100%',
  minHeight: inRem(44),
  padding: `${inRem(10)} ${inRem(2)}`,
  textAlign: 'left',
  cursor: 'pointer',
  background: 'none',
  border: 0,
  color: STREET.ink,
  font: 'inherit',
  // The font's own, as a button in the drawing has it: the page's 1.5 would make
  // every row 6px taller than the drawing's 47 (`.word-list button`, line 182).
  lineHeight: 'normal',
  '&:focus-visible': { outline: `3px solid ${STREET.ochre}`, outlineOffset: '-3px' },
};

/**
 * The row's third track, `.state` (line 185): "answered" in slate 15px, and for
 * a word that is done spruce, bold, behind a tick. The word is the cue and the
 * tick is a second one, so no row is told from another by its colour alone, and
 * the row's accessible name says it again out loud (issue #150).
 */
const stateSx = (isSolved: boolean): CSSObject => ({
  marginLeft: 'auto',
  fontSize: inRem(15),
  color: isSolved ? STREET.spruce : STREET.slate,
  fontWeight: isSolved ? WEIGHTS.bold : WEIGHTS.regular,
});

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
        sx={{ borderTop: RULE, '&:last-child': { borderBottom: RULE } }}
      >
        <Box
          component="button"
          type="button"
          onClick={() => onSelectWord(entry.location)}
          aria-label={entry.name}
          sx={ROW_SX}
        >
          <Box
            component="span"
            sx={{
              width: REFERENCE_TRACK_WIDTH,
              flex: 'none',
              color: STREET.slate,
              fontSize: inRem(15),
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
            }}
          >
            {entry.reference}
          </Box>

          <Box
            component="span"
            sx={{
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
