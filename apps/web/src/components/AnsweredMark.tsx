import Box from '@mui/material/Box';

import { SCENE, SCENE_LINE } from '../garden/scene-palette';

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
 * and colour blindness on its own, before the row's other cues (the struck-
 * through word, the dimmed track) are counted at all. It is drawn in the same
 * red the garden already spends on every action it offers
 * ({@link SCENE.vermilionLit}, `garden/scene-palette.ts`) rather than in a
 * colour of its own, so introducing it here does not give this place a second
 * accent to keep apart from the first.
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
        ? { backgroundColor: SCENE.vermilionLit }
        : { boxShadow: `inset 0 0 0 1.5px ${SCENE_LINE}` }),
    }}
  />
);
