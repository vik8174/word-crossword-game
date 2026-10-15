import { inRem } from '../scale';
import { STREET } from '../street';

/**
 * How what stands under a board is set, for both boards: the player's
 * (`CrosswordGrid`, its hints and the word about a refused answer) and the
 * teacher's (`TeacherGrid`, its legend).
 */

/** One line under the board (`.board-note`): 15px, slate, centred. */
export const NOTE_SX = {
  margin: 0,
  fontSize: inRem(15),
  lineHeight: 1.6,
  color: STREET.slate,
  textAlign: 'center',
} as const;

/**
 * What stands under the board (`.board-notes`, `state-tree.html` lines
 * 209-211): at most 560px wide, centred, 16px under the board and 6px apart.
 */
export const NOTES_SX = {
  display: 'flex',
  flexDirection: 'column',
  gap: inRem(6),
  maxWidth: inRem(560),
  margin: `${inRem(16)} auto 0`,
} as const;
