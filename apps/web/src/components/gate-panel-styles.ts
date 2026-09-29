import type { CSSObject } from '@mui/material/styles';

import { BAND } from '../garden/scene-palette';
import { inRem } from '../scale';

/**
 * The create screen's own surface, drawn the way the template draws it
 * (`design/templates/state-tree.html`'s `.gate-screen`, `.create-band` and
 * `.stack`, lines 413, 460-466 and 398).
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
 * The screen the panel stands in: the whole window, the panel centred in it.
 *
 * Exactly a window tall rather than at least one, because the panel scrolls
 * inside itself ({@link createPanelSx}) instead of the page growing — a screen
 * that grew with its content would be a screen the panel's `max-height: 100%`
 * has nothing to be a hundred percent of. `overflow-y: auto` stays on it all
 * the same, as the template has it, for a window so short the panel's own
 * padding cannot fit.
 */
export const createScreenSx: CSSObject = {
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
