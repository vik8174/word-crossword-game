import { type SxProps, type Theme } from '@mui/material/styles';

import { STREET } from '../street';
import { TEXT_FONT_FAMILY } from '../theme';
import { CELL_SIDE } from './board-geometry';

/**
 * What every square of the board is drawn with, whichever board it is on: the
 * player's own (`GridSquare`) and the teacher's (`TeacherSquare`). One place,
 * so a square the teacher sees answered is the square a player sees answered
 * and the two cannot drift (`design/templates/state-tree.html`, `.cell`, lines
 * 192-205).
 */

/** The soft shadow every square of the drawing stands on, two pixels down and to the right. */
export const SQUARE_SHADOW = '2px 2px 0 0 rgba(27, 45, 56, 0.22)';

/** The outline of an ordinary square: 1.5px of ink, drawn inside the box. */
export const INK_OUTLINE = `inset 0 0 0 1.5px ${STREET.ink}`;

/**
 * The crossword number of a square, in its top-left corner, as a crossword
 * prints it (`.cell .num`, `design/templates/state-tree.html` line 197): 3px
 * down and 4px in, 700, in `slate`, at a quarter of the square with a floor of
 * 9px so that it keeps its share of a square that shrinks and never becomes a
 * smudge. Slate on sage is 5.03:1 and on the other surfaces more, so it reads
 * on every kind of square. It takes no clicks: the square below it is the thing
 * to press, and it is said in the square's own label rather than read off the
 * screen.
 *
 * The family is named rather than left to inherit it, even though it would
 * resolve to the same text face either way: a square this player types into
 * is an `input`, which the letter below takes its own family back onto for
 * the same reason (`inherit` would take a font from a box the number is not
 * drawn on the same layer as).
 */
export const NUMBER_SX: SxProps<Theme> = {
  position: 'absolute',
  top: '3px',
  left: '4px',
  fontFamily: TEXT_FONT_FAMILY,
  fontSize: `max(9px, calc(${CELL_SIDE} * 0.25))`,
  fontWeight: 700,
  lineHeight: 1,
  color: STREET.slate,
  pointerEvents: 'none',
};

/**
 * How an answered square is drawn: a 2px outline in spruce where the others
 * have 1.5px of ink, letters in 700, and a tick in the lower right
 * ({@link TICK_SX}). Three cues, so that the answered square is told from an
 * explained one (dashed, italic) and from an empty one with the colour removed.
 */
export const ANSWERED_SQUARE_SX: SxProps<Theme> = {
  boxShadow: `inset 0 0 0 2px ${STREET.spruce}, ${SQUARE_SHADOW}`,
  fontWeight: 700,
};

/** The tick of an answered square, `.cell.guessed::after`: a rotated corner in spruce. */
export const TICK_SX = {
  content: '""',
  position: 'absolute',
  right: '12%',
  bottom: '14%',
  width: '18%',
  height: '9%',
  borderLeft: `2px solid ${STREET.spruce}`,
  borderBottom: `2px solid ${STREET.spruce}`,
  transform: 'rotate(-45deg)',
  pointerEvents: 'none',
} as const;

/**
 * The square before it is any kind of square: its size from the board's own
 * variable, an ink ring and the soft shadow, the letter at 58 % of the side in
 * upper case, in the text face. The fill, and what makes it a kind, are added
 * by whoever draws it.
 *
 * The family is named rather than left to inherit it: a square this player
 * types into is an `input`, which takes none of the page's typography on its
 * own, and a letter said in a box beside it should match the one said there
 * rather than track it by accident. The letter keeps its share of the square
 * rather than a size of its own, so a board drawn small stays a board of
 * letters rather than of dots. Upper-case as the board has always been; the
 * drawing sets the letters lower-case, and this is its one allowed difference.
 */
export const SQUARE_BASE_SX = {
  height: CELL_SIDE,
  width: CELL_SIDE,
  boxSizing: 'border-box',
  borderRadius: '5px',
  border: 0,
  // The browser's focus ring is the cursor's ring, drawn once.
  outline: 'none',
  boxShadow: `${INK_OUTLINE}, ${SQUARE_SHADOW}`,
  color: STREET.ink,
  display: 'grid',
  placeItems: 'center',
  fontFamily: TEXT_FONT_FAMILY,
  fontSize: `calc(${CELL_SIDE} * 0.58)`,
  fontWeight: 400,
  lineHeight: 1,
  padding: 0,
  paddingBottom: '6%',
  textTransform: 'uppercase',
} as const;
