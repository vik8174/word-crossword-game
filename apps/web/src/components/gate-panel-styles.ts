import type { CSSObject } from '@mui/material/styles';

import { inRem } from '../scale';
import { STREET } from '../street';

/**
 * The column a form stands in at the doors, the way the template draws it
 * (`design/templates/state-tree.html`'s `.column`, `.stack`, `.row-btns`,
 * `.hint`, `.lede` and `.wait-line`, lines 111-117 and 253-258).
 *
 * None of the numbers here is a step of `scale.ts`'s spacing row or one of its
 * four text levels: they are the template's own values, written once here
 * rather than turned into steps nothing else is drawn at. Lengths are in `rem`
 * (through {@link inRem}) so that a reader who has made their text larger gets
 * a column that grows with it; on a browser left at sixteen pixels they come
 * out as the template's pixels.
 */

/** From the template's tablet layout up the side padding is 32px, 48px from wide (`--pad`, lines 221-223). */
const FROM_TABLET = '@media (min-width: 768px)';
const FROM_WIDE = '@media (min-width: 1200px)';

/**
 * The screen a form or a notice stands in: `.column`
 * (`design/templates/state-tree.html`, lines 253-254).
 *
 * At most 560px wide and centred, with 48px above it (24px on a phone) and
 * 48px below, and the side padding the layout has (18, 32 and 48px). It starts
 * at the top, under the frame's header, and it is not centred in what the
 * header leaves: where a title stands does not depend on how much stands under
 * it, so it does not move between the states of a screen (issue #225).
 *
 * `/create` stands in it, and so do every screen at the doors (`DoorColumn`):
 * `connecting`, `join` and the refusals, with the street drawn above it (issue
 * #226).
 */
export const gateScreenSx: CSSObject = {
  position: 'relative',
  maxWidth: inRem(560),
  marginInline: 'auto',
  padding: `${inRem(24)} ${inRem(18)} ${inRem(48)}`,
  [FROM_TABLET]: { paddingInline: inRem(32), paddingTop: inRem(48) },
  [FROM_WIDE]: { paddingInline: inRem(48) },
};

/** `.stack`: the blocks of a form in one column, 18px apart. */
export const gateStackSx: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: inRem(18),
};

/**
 * `.row-btns`: a screen's buttons, and the sentence that stands beside them,
 * in one row from the left, 12px apart, wrapping when the row is full.
 */
export const gateButtonRowSx: CSSObject = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: inRem(12),
};

/**
 * The sentence beside a button: `.hint`, slate 16px
 * (`design/templates/state-tree.html`, line 114).
 */
export const gateHintSx: CSSObject = {
  margin: 0,
  fontSize: inRem(16),
  color: STREET.slate,
};

/**
 * `.column .scene`: the drawing above a gate screen's column, at most 440px
 * wide and centred, 28px above the first block under it
 * (`design/templates/state-tree.html`, line 255).
 */
export const gateSceneSx: CSSObject = {
  maxWidth: inRem(440),
  marginInline: 'auto',
  marginBottom: inRem(28),
};

/** The template's phone layout, narrower than its tablet one (`layoutFor`). */
const PHONE = '@media (max-width: 767.95px)';

/**
 * `p.lede`: the sentence under a step's title, slate, 24px and 20px on a phone
 * (`design/templates/state-tree.html`, lines 111 and 248).
 */
export const gateLedeSx: CSSObject = {
  margin: 0,
  fontSize: inRem(24),
  lineHeight: 1.4,
  color: STREET.slate,
  overflowWrap: 'anywhere',
  [PHONE]: { fontSize: inRem(20) },
};

/**
 * `.wait-line`: the dot and the sentence it waits with, on one line in the
 * middle of the column, 12px apart (template line 256).
 */
export const gateWaitLineSx: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: inRem(12),
  margin: 0,
  fontSize: inRem(20),
  color: STREET.ink,
};
