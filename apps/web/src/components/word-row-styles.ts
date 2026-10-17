import type { CSSObject } from '@mui/material/styles';

import { inRem, WEIGHTS } from '../scale';
import { STREET } from '../street';
import { OUTLINE_WIDTH } from './surface-styles';

/**
 * How a row of a word list is set, for the two lists that draw one: the player's
 * (`WordEntryList`, rows that go to a word) and the teacher's
 * (`TeacherWordsPanel`, rows that only say how a word stands). The template draws
 * both as `.word-list` (`design/templates/state-tree.html`, lines 189-201; the teacher's plain row is `.row`, lines 320-321), and
 * they stay the same list in two places because the numbers are here once.
 */

/** A hairline between rows, and under the last: `.word-list li` (template line 190). */
export const WORD_RULE = `${OUTLINE_WIDTH}px solid ${STREET.line}`;

/**
 * Width of the reference track: the template's own 74px (`.word-list .ref`, line
 * 193), in `rem`. It holds `18 across`, the longest name a game of 20 words
 * has, with room to spare, so every word in a list starts at the same point.
 */
export const REFERENCE_TRACK_WIDTH = inRem(74);

/**
 * One row's layout (`.word-list button`, template line 192): three tracks side
 * by side, 12px apart, at least 44px tall.
 *
 * The font's own line height, as a button in the drawing has it: the page's 1.5
 * would make every row 6px taller than the drawing's 47.
 */
export const ROW_LAYOUT_SX: CSSObject = {
  display: 'flex',
  alignItems: 'baseline',
  gap: inRem(12),
  width: '100%',
  minHeight: inRem(44),
  padding: `${inRem(10)} ${inRem(2)}`,
  textAlign: 'left',
  color: STREET.ink,
  font: 'inherit',
  lineHeight: 'normal',
};

/** The row's first track, `.ref` (lines 193 and 195): slate 15px in a fixed width, with `margin-right: auto`
 * so the word and the state stand at the row's right edge. */
export const REFERENCE_SX: CSSObject = {
  width: REFERENCE_TRACK_WIDTH,
  flex: 'none',
  color: STREET.slate,
  fontSize: inRem(15),
  fontVariantNumeric: 'tabular-nums',
  marginRight: 'auto',
  whiteSpace: 'nowrap',
};

/**
 * The row's word or guess slots, `.word` and `.slots` (line 196): the last track,
 * set at the row's right edge, text right-aligned. `order` puts it after the
 * state while the DOM keeps the word first.
 */
export const WORD_END_SX: CSSObject = { order: 2, textAlign: 'right' };

/**
 * The row's state, `.state` (lines 197-201): "answered" in slate 15px, and for
 * a word that is done spruce, bold, behind a tick. The word is the cue and the
 * tick is a second one, so no row is told from another by its colour alone, and
 * the row's accessible name says it again out loud (issue #150). It stands just
 * before the word (`order: 1`), and an empty state takes no space (`:empty`).
 */
export const stateSx = (isSolved: boolean): CSSObject => ({
  order: 1,
  '&:empty': { display: 'none' },
  fontSize: inRem(15),
  color: isSolved ? STREET.spruce : STREET.slate,
  fontWeight: isSolved ? WEIGHTS.bold : WEIGHTS.regular,
});
