import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import Typography from '@mui/material/Typography';

import type { WordLocation } from '../rooms/word-visibility';
import { AnsweredMark } from './AnsweredMark';
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

/**
 * The sentence of a row when it is done, struck through wherever it has
 * anything to strike — the reference always, the word too where this half of
 * the game draws one — and dimmed wherever the surface underneath lets that
 * show.
 *
 * The dimming is inherited rather than new here, and so is its one gap: on
 * the band a room stands its zones on, `scene-surface.ts`'s
 * `.MuiTypography-body2` rule is more specific than this `sx` and wins, so a
 * done row on that band is struck through without being dimmed. Pre-existing
 * and out of scope for issue #150, which is why the third signal below is the
 * one this ticket can actually promise everywhere.
 *
 * Kept apart from {@link AnsweredMark} on purpose: whether a word is done is
 * said by things that do not depend on each other — this styling, the mark's
 * own shape, and the sentence in the row's accessible name — so no single one
 * of them carries the state alone (issue #150).
 */
const doneSx = {
  textDecoration: 'line-through',
  color: 'text.secondary',
} as const;

/**
 * Width of the reference track: wide enough for the longest number this game
 * ever numbers a word with — two digits, `MAX_WORDS` in `shared` being 20 —
 * plus the longer of the two directions, "across", in the crossword's own
 * face. Fixed rather than measured, so `1 across` and `18 across` occupy the
 * same width and every word in the list starts its own track at the same
 * point (issue #150).
 */
const REFERENCE_TRACK_WIDTH = '5.6em';

/**
 * The list under one of the two headings: every word of that half, each one a
 * button that goes to it.
 *
 * Every entry is a button because for twenty words the grid can be wider than
 * the zone it is drawn in and part of the board out of view: the numbers in the
 * grid are there to find a word once somebody names it, and this is what does
 * the finding (`docs/decisions/0016-the-cursor-lives-in-the-grid.md`).
 *
 * A row draws in three tracks — reference, word, mark — but they are what the
 * eye gets and nothing else does: the columns are laid out with CSS grid on
 * the button itself, and the button's accessible name stays
 * {@link WordEntry.name}, the whole sentence, whether or not this half of the
 * game has a word to show in the middle one. A reader moving through the list
 * by line is handed the same sentence a sighted player reads across three
 * columns, never half of it (issue #150).
 *
 * Whether a word is done is said more than one way, and the ways do not
 * depend on each other: struck through (and dimmed, where the surface lets
 * it — see {@link doneSx}) here, a different shape in {@link AnsweredMark},
 * and outright in {@link WordEntry.name} — so it never rests on telling one
 * mark's colour from another.
 *
 * @param props.labelledBy - Id of the heading naming this half of the game
 * @param props.entries - The words of that half
 * @param props.onSelectWord - Called with where a tapped word runs
 *
 * @example
 * <WordEntryList labelledBy="to-guess-heading" entries={entries} onSelectWord={goTo} />
 */
export const WordEntryList = ({ labelledBy, entries, onSelectWord }: WordEntryListProps) => (
  <List dense disablePadding aria-labelledby={labelledBy}>
    {entries.map((entry) => (
      <ListItem key={entry.id} disableGutters disablePadding>
        <ListItemButton
          onClick={() => onSelectWord(entry.location)}
          aria-label={entry.name}
          sx={{
            py: 1,
            px: 1,
            display: 'grid',
            gridTemplateColumns: `${REFERENCE_TRACK_WIDTH} minmax(0, 1fr) auto`,
            columnGap: 1,
            alignItems: 'baseline',
          }}
        >
          <Typography
            component="span"
            variant="body2"
            sx={{
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
              ...(entry.isSolved ? doneSx : {}),
            }}
          >
            {entry.reference}
          </Typography>

          {/* Rendered even where this half has no word to show, so the mark
            always lands in the grid's third track rather than sliding into
            the second one behind it. */}
          <Typography
            component="span"
            variant="body2"
            sx={{ minWidth: 0, overflowWrap: 'anywhere', ...(entry.isSolved ? doneSx : {}) }}
          >
            {entry.word}
          </Typography>

          <AnsweredMark isSolved={entry.isSolved} />
        </ListItemButton>
      </ListItem>
    ))}
  </List>
);
