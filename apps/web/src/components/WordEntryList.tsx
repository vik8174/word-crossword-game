import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import Typography from '@mui/material/Typography';

import type { WordLocation } from '../rooms/word-visibility';
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
 * The list under one of the two headings: every word of that half, each one a
 * button that goes to it.
 *
 * Every entry is a button because for twenty words the grid can be wider than
 * the zone it is drawn in and part of the board out of view: the numbers in the
 * grid are there to find a word once somebody names it, and this is what does
 * the finding (`docs/decisions/0016-the-cursor-lives-in-the-grid.md`).
 *
 * Whether a word is done is said in words as well as struck through and
 * recoloured, so it does not rest on telling grey from black — the saying is in
 * {@link WordEntry.name} and the striking through is here.
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
      // One unbroken line per word rather than a number in its own element: the
      // number, the direction and the state are read together, and a reader
      // moving through the list by line should never be handed half of one. That
      // line is also the button's whole name, so tapping it is offered in the
      // same words.
      <ListItem key={entry.id} disableGutters disablePadding>
        <ListItemButton onClick={() => onSelectWord(entry.location)} sx={{ py: 0.25, px: 0.5 }}>
          <Typography
            variant="body2"
            sx={
              entry.isSolved
                ? { textDecoration: 'line-through', color: 'text.secondary' }
                : undefined
            }
          >
            {entry.name}
          </Typography>
        </ListItemButton>
      </ListItem>
    ))}
  </List>
);
