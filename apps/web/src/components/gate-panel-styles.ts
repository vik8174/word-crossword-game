import type { CSSObject } from '@mui/material/styles';

import { inRem } from '../scale';
import { STREET } from '../street';
import { TILE_SX } from './surface-styles';

/**
 * The column a form stands in at the doors, the way the template draws it
 * (`design/templates/state-tree.html`'s `.column`, `.stack`, `.row-btns` and
 * `.hint`, lines 113-116 and 253-254), and the doors' panel (`.middle-column`).
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
 * `/create` stands in it, and so do `connecting` and every `unavailable` at the
 * doors (`pages/RoomPage.tsx`'s `Waiting`). Those two moved to the top with it,
 * ahead of the doors' own issue (#226), and that was accepted.
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
 * The doors' panel: `.middle-column`, the one surface `connecting`, `join` and
 * every `unavailable` stand on (issue #198).
 *
 * A tile with the street's hairline round it, as every surface is. It is as wide as the template's 430px or
 * 92% of what it stands in, whichever is less, and as tall as what is on it, so
 * it needs no `max-height` of its own: the frame or screen it stands in scrolls
 * instead. Lengths are in `rem` so that it grows with the reader's own text size.
 *
 * `line-height: 1.6` is the template's page-wide value, which its panel
 * inherits and this app's body (1.5) does not.
 */
export const middlePanelSx: CSSObject = {
  width: `min(${inRem(430)}, 92%)`,
  ...TILE_SX,
  padding: `${inRem(24)} ${inRem(24)} ${inRem(26)}`,
  borderRadius: '2px',
  lineHeight: 1.6,
};

/**
 * `p.lede`: the sentence above a form on the doors' panel.
 *
 * Ink. A `p` of its own rather than a `Typography`: the template draws 13px
 * here and no variant of this app's four text levels is that size under this
 * name.
 */
export const middleLedeSx: CSSObject = {
  margin: `0 0 ${inRem(16)}`,
  fontSize: inRem(13),
  lineHeight: 1.6,
  color: STREET.ink,
};
