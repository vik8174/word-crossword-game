import { inRem } from '../scale';
import { STREET } from '../street';
import { OUTLINE_WIDTH } from './surface-styles';

/**
 * How the frame's header is set: its widths, the wordmark and the status line
 * (`design/templates/state-tree.html`, lines 108-109 and 217-225).
 */

/** From here up the header has the width for a status line (the template's tablet layout). */
export const FROM_TABLET = '@media (min-width: 768px)';

/** From here up the header's sides are the widest (the template's wide layout). */
export const FROM_WIDE = '@media (min-width: 1200px)';

/** Under 768 there is no room for a status line, and the header is a wordmark and an action. */
export const FRAME_PHONE = '@media (max-width: 767.95px)';

/**
 * The name, set the way the template's `.wordmark` sets it
 * (`design/templates/state-tree.html`, lines 108-109): bold, 20px, after a tile
 * 16px square turned 6 degrees back, with the tile's own hairline and a shadow
 * of `ink` two pixels down and to the right.
 */
export const WORDMARK_SX = {
  display: 'flex',
  alignItems: 'center',
  gap: inRem(10),
  fontSize: inRem(20),
  fontWeight: 700,
  whiteSpace: 'nowrap',
  color: STREET.ink,
  '&::before': {
    content: '""',
    flex: 'none',
    width: inRem(16),
    height: inRem(16),
    borderRadius: '3px',
    backgroundColor: STREET.tile,
    boxShadow: `0 0 0 ${OUTLINE_WIDTH}px ${STREET.ink}, 2px 2px 0 0 ${STREET.ink}`,
    transform: 'rotate(-6deg)',
  },
} as const;

/**
 * What the name adds when it is a link (`.wordmark-link`, `design/templates/state-tree.html`
 * lines 109-111): no colour change and no underline at rest, a 1.5px underline 5px
 * off on hover, and the ochre ring (3px, 4px off) on keyboard focus. The box is
 * the plain name's: no padding, so the rect does not move.
 */
export const WORDMARK_LINK_SX = {
  color: 'inherit',
  textDecoration: 'none',
  borderRadius: '6px',
  '&:hover': {
    textDecoration: 'underline',
    textDecorationThickness: '1.5px',
    textUnderlineOffset: '5px',
  },
  '&:focus-visible': { outline: `3px solid ${STREET.ochre}`, outlineOffset: '4px' },
} as const;

/** The status line: slate, in the middle of the space the wordmark and the action leave, and gone on a phone. */
export const STATUS_SX = {
  flex: 1,
  minWidth: 0,
  color: STREET.slate,
  textAlign: 'center',
  [FRAME_PHONE]: { display: 'none' },
} as const;
