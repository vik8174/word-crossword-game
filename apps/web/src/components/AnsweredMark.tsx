import Box from '@mui/material/Box';

import { STREET } from '../street';

interface AnsweredMarkProps {
  /** `true` once the word behind this row has been answered. */
  readonly isSolved: boolean;
}

/**
 * The third track of a clue row: a lit dot once a word is answered, an empty
 * ring while it is still open.
 *
 * Decorative rather than the source of truth. The word "answered" is said in
 * {@link WordEntry.name}, which is the row's accessible name, so this mark
 * carries `aria-hidden` and a screen reader never depends on it
 * (`docs/decisions/0016-the-cursor-lives-in-the-grid.md`, issue #150).
 *
 * The two states are two shapes rather than two colours of the same one — a
 * filled disc against a hollow ring — so the distinction survives greyscale
 * and colour blindness on its own, before the row's other cue (the struck-
 * through word) is counted at all. The disc is the action's spruce, which is
 * what "answered" is in the drawing's lists, and the ring is slate: this circle
 * is what says a word is still open, so it is drawn at the weight of the edge
 * of a control and not at the weight of a rule.
 *
 * @param props.isSolved - Whether to draw it lit or as an open ring
 *
 * @example
 * <AnsweredMark isSolved={entry.isSolved} />
 */
export const AnsweredMark = ({ isSolved }: AnsweredMarkProps) => (
  <Box
    aria-hidden="true"
    sx={{
      width: 9,
      height: 9,
      borderRadius: '50%',
      flexShrink: 0,
      alignSelf: 'center',
      ...(isSolved
        ? { backgroundColor: STREET.spruce }
        : { border: `1.5px solid ${STREET.slate}` }),
    }}
  />
);
