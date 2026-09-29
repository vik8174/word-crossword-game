import type { CSSObject } from '@mui/material/styles';

import { BAND, BAND_SOLID, SCENE } from '../garden/scene-palette';
import { inRem } from '../scale';

/**
 * The surfaces the gate's panels and the doors' panel are drawn on, the way the
 * template draws them (`design/templates/state-tree.html`'s `.gate-screen`,
 * `.create-band`, `.middle-column` and `.stack`, lines 413, 460-466, 402-410
 * and 398).
 *
 * None of the numbers here is a step of `scale.ts`'s spacing row or one of its
 * four text levels, the same way `field-styles.ts`'s 13.5px and
 * `button-styles.ts`'s 11.5px are not: they are the template's own values,
 * written once here rather than turned into steps nothing else is drawn at.
 * Lengths are in `rem` (through {@link inRem}) so that a reader who has made
 * their text larger gets a panel that grows with it, the reason
 * `GATE_BAND_WIDTH` is in `rem`; on a browser left at sixteen pixels they come
 * out as the template's pixels.
 */

/**
 * The screen a panel stands in: the whole window, the panel centred in it.
 * `/create` stands in it, and so do `connecting` and every `unavailable` at the
 * doors (`pages/RoomPage.tsx`'s `Waiting`, issue #198).
 *
 * Exactly a window tall rather than at least one, because the panel scrolls
 * inside itself ({@link createPanelSx}) instead of the page growing — a screen
 * that grew with its content would be a screen the panel's `max-height: 100%`
 * has nothing to be a hundred percent of. `overflow-y: auto` stays on it all
 * the same, as the template has it, for a window so short the panel's own
 * padding cannot fit.
 */
export const gateScreenSx: CSSObject = {
  position: 'relative',
  height: '100dvh',
  display: 'grid',
  placeItems: 'center',
  padding: inRem(22),
  overflowY: 'auto',
};

/**
 * The panel itself, as tall as what stands on it.
 *
 * Centred by the grid it stands in rather than by margins, which is what
 * `CreateRoomPage.tsx` used `m: 'auto'` for: a centred box taller than its
 * frame pushes its own top off the page, and the answer here is that it never
 * becomes taller than the frame — `max-height: 100%` with its own scroll — so
 * there is no overflowing centre to keep the top of.
 *
 * `backdrop-filter` is written twice for a browser that still asks for the
 * prefix, the way the template writes it.
 */
export const createPanelSx: CSSObject = {
  width: `min(${inRem(460)}, 94%)`,
  backgroundColor: BAND,
  backdropFilter: 'blur(2px)',
  WebkitBackdropFilter: 'blur(2px)',
  padding: `${inRem(20)} ${inRem(22)} ${inRem(24)}`,
  borderRadius: '2px',
  maxHeight: '100%',
  overflowY: 'auto',
  // The template's page sets 1.6 on its body and everything in the panel
  // inherits it; this app's body is 1.5. Nothing here sets its own line except
  // the lines that say so (the help under a field, the button, the message's
  // paragraph), but `Message`'s heading and its list do not, and they come out
  // 3.4px short in the panel without this (issue #197, `create/errors`).
  lineHeight: 1.6,
};

/** `.stack`: the blocks of a form in one column, 14px apart. */
export const gateStackSx: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: inRem(14),
};

/**
 * The fork's two buttons: right-aligned, 10px apart — `.field-row` with
 * `justify-content: flex-end`.
 */
export const gateButtonRowSx: CSSObject = {
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  gap: inRem(10),
};

/**
 * The doors' panel: `.middle-column`, the one surface `connecting`, `join` and
 * every `unavailable` stand on (issue #198).
 *
 * Opaque where the create panel is translucent (`BAND_SOLID`, not `BAND`),
 * which is the template's own difference between the two. It is as wide as the
 * template's 430px or 92% of what it stands in, whichever is less, and as tall
 * as what is on it, so it needs no `max-height` of its own: the frame or screen
 * it stands in scrolls instead. Lengths are in `rem` for the reason the create
 * panel's are.
 *
 * `line-height: 1.6` is the template's page-wide value, which its panel
 * inherits and this app's body (1.5) does not: `Message`'s heading and list set
 * none of their own and come out short without it, exactly as they did on the
 * create panel.
 */
export const middlePanelSx: CSSObject = {
  width: `min(${inRem(430)}, 92%)`,
  backgroundColor: BAND_SOLID,
  backdropFilter: 'blur(2px)',
  WebkitBackdropFilter: 'blur(2px)',
  padding: `${inRem(24)} ${inRem(24)} ${inRem(26)}`,
  borderRadius: '2px',
  boxShadow: '0 18px 44px -26px rgba(0, 0, 0, 0.8)',
  lineHeight: 1.6,
};

/**
 * `p.lede`: the sentence above a form on the doors' panel.
 *
 * Full cream and not `SCENE_INK_DIM`, which the template's own rule writes as
 * `--scene-ink`. A `p` of its own rather than a `Typography`: the template
 * draws 13px here and no variant of this app's four text levels is that size
 * under this name.
 */
export const middleLedeSx: CSSObject = {
  margin: `0 0 ${inRem(16)}`,
  fontSize: inRem(13),
  lineHeight: 1.6,
  color: SCENE.cream,
};
