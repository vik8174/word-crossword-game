import type { SxProps, Theme } from '@mui/material/styles';

import { MOTION_MS, OUT_CURVE } from '../motion';
import { inRem } from '../scale';
import { STREET } from '../street';

/**
 * The two cards that choose what a room is for — `.mode-pick` and `.mode-opt`
 * in `design/templates/state-tree.html` (lines 280-289), as `sx` objects, and
 * the movement of lines 353 and 356.
 *
 * A card is a tile with a 1.5px ink ring drawn as a `box-shadow`, 12px corners
 * and a title in front of which stands a round mark: hollow when the card is not
 * chosen, filled in spruce with a tile centre when it is. The chosen card is
 * ringed in 3px spruce with the hard 3px shadow of the loud button. What is
 * chosen is never carried by the ring alone: the mark is drawn with a shape and
 * the card says `aria-checked`.
 */

/** The template's phone layout, under which the two cards stand one above the other. */
const PHONE = '@media (max-width: 767.95px)';

/** The system setting that means "move"; the movement is all inside it. */
const NO_REDUCED_MOTION = '@media (prefers-reduced-motion: no-preference)';

/** The ring round a card at rest, and the ring and shadow of the chosen one (lines 281 and 282). */
const RING = `0 0 0 1.5px ${STREET.ink}`;
const CHOSEN_RING = `0 0 0 3px ${STREET.spruce}, 3px 3px 0 0 ${STREET.ink}`;

/** The two cards, side by side from the tablet layout up and one above the other on a phone (line 279-280). */
export const modePickSx: SxProps<Theme> = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: inRem(12),
  [PHONE]: { gridTemplateColumns: '1fr' },
};

/**
 * One card (`.mode-opt`), chosen or not.
 *
 * It lifts 1px on hover, and takes the button's own transitions: 160ms on
 * `--out` for the lift and the shadow, 220ms on `ease` for the colour (line
 * 353, whose row #230 wrote as `lift` and `tone`). The template lifts a card
 * whatever its state and so does this, a locked card included.
 *
 * @param chosen - Whether this is the mode that is picked
 */
export const modeOptionSx = (chosen: boolean): SxProps<Theme> => ({
  display: 'flex',
  flexDirection: 'column',
  gap: inRem(4),
  textAlign: 'left',
  backgroundColor: STREET.tile,
  border: 0,
  borderRadius: inRem(12),
  padding: `${inRem(14)} ${inRem(16)}`,
  boxShadow: chosen ? CHOSEN_RING : RING,
  cursor: 'pointer',
  color: STREET.ink,
  font: 'inherit',
  '&:focus-visible': { outline: `3px solid ${STREET.ochre}`, outlineOffset: '4px' },
  [NO_REDUCED_MOTION]: {
    transition: `transform ${MOTION_MS.lift}ms ${OUT_CURVE}, box-shadow ${MOTION_MS.lift}ms ${OUT_CURVE}, background-color ${MOTION_MS.tone}ms ease`,
    '&:hover': { transform: 'translateY(-1px)' },
  },
});

/** The card's title with the mark in front of it (`.mode-opt b`, lines 284-286). */
export const modeTitleSx = (chosen: boolean): SxProps<Theme> => ({
  display: 'flex',
  alignItems: 'center',
  gap: inRem(10),
  fontSize: inRem(19),
  fontWeight: 700,
  '&::before': {
    content: '""',
    flex: 'none',
    width: inRem(16),
    height: inRem(16),
    borderRadius: '50%',
    backgroundColor: chosen ? STREET.spruce : STREET.tile,
    boxShadow: chosen
      ? `inset 0 0 0 1.5px ${STREET.ink}, inset 0 0 0 4px ${STREET.tile}`
      : `inset 0 0 0 1.5px ${STREET.ink}`,
  },
});

/** What the card says under its title (`.mode-opt span`, line 287). */
export const modeTextSx: SxProps<Theme> = {
  fontSize: inRem(15),
  color: STREET.slate,
  lineHeight: 1.4,
};
