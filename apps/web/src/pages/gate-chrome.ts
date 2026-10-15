import type { CSSObject } from '@mui/material/styles';

import { belowFrame } from '../components/frame-height';
import { STREET } from '../street';

/**
 * Where the landing page's lockup — the name, a rule and the tagline as one
 * block — and its one action stand.
 *
 * The numbers here are places on a photograph of a gate, measured against its
 * pixels (issue #151) and followed from the old template's formula (issue
 * #191). The photograph was removed with the garden (issue #222) and this
 * module moved beside the page that reads it with its layout unchanged: the
 * landing page is redrawn on its own issue (#224), and these are replaced there.
 * What is new is only the colour, which is `ink` of the street's palette.
 *
 * Everything here is a percentage of the stage, the box `HomePage.tsx` sizes to
 * the window less the frame's header. The stage is exactly that, and a
 * percentage of it is a percentage a `getBoundingClientRect` reading can be
 * checked against directly.
 */

/** The block's top edge, as a percentage of the stage's height, at every window. */
const LOCKUP_TOP = 5;

/**
 * The block's width when the window is at least as wide as 16:9: a flat
 * share of the stage, the same at every window in that range.
 */
const LOCKUP_WIDE_WIDTH = '52%';

/**
 * The block's width on a window narrower than 16:9: `100vh * 16 / 9`, less the
 * frame's header (issue #245) because the stage is that much shorter, is the
 * width of a 16:9 stage as tall as this one, and 0.52 of that is the same
 * share `LOCKUP_WIDE_WIDTH` reads off the window directly at 16:9 and wider.
 * Capped at 92% of the window so the block never touches the edges of a very
 * narrow one.
 */
const LOCKUP_NARROW_WIDTH = `min(92%, calc(${belowFrame('100vh')} * 16 / 9 * 0.52))`;

/**
 * The name's and the rule's shared size, both driving off the same `clamp`
 * so the rule's `margin-top: .28em` scales with the name it sits under. The
 * template's `cqw` written as `vw`: the container the template measures
 * against is the full window, and so is `HomePage.tsx`'s own root.
 */
export const GATE_LOCKUP_TEXT_SIZE = 'clamp(15px, 2.35vw, 31px)';

/**
 * A share of the stage, to one decimal place.
 *
 * The block's position is measured to a tenth of a per cent, and plain
 * floating-point arithmetic does not always stay there, which would write a
 * CSS value nobody chose and a test nobody could write a round number
 * against. Fixed to one decimal rather than left exact, because one decimal
 * is the precision the measurement itself was made to.
 *
 * @param value - The number of percentage points
 * @returns It as a CSS percentage
 */
const pct = (value: number): string => `${value.toFixed(1)}%`;

/**
 * Where the block — the name, the rule and the tagline together — stands
 * against the stage: centred, its top edge 5% down, its width the
 * template's own formula.
 *
 * `pointerEvents: 'none'` because nothing under a decorative block of
 * lettering and a rule needs to catch a click or a hover the way the button
 * below it does.
 */
export const GATE_LOCKUP_SX: CSSObject = {
  position: 'absolute',
  left: '50%',
  top: pct(LOCKUP_TOP),
  transform: 'translateX(-50%)',
  width: LOCKUP_WIDE_WIDTH,
  textAlign: 'center',
  pointerEvents: 'none',
  '@media (max-aspect-ratio: 16/9)': {
    width: LOCKUP_NARROW_WIDTH,
  },
};

/**
 * The rule between the name and the tagline: decoration, not a heading
 * separator — `aria-hidden` where it is used, and a `div` rather than an
 * `<hr>`, because nothing is read out between the name and the tagline
 * (issue #191, "the rule is decoration").
 *
 * `fontSize: GATE_LOCKUP_TEXT_SIZE` carries no visible text of its own — it
 * is what lets `margin-top: .28em` scale with the name's own size instead of
 * standing still while the name around it grows and shrinks with the window.
 */
export const GATE_RULE_SX: CSSObject = {
  fontSize: GATE_LOCKUP_TEXT_SIZE,
  height: '2px',
  width: 'min(220px, 46%)',
  margin: '0.28em auto 0',
  backgroundColor: STREET.ink,
};

/**
 * Where the one button stands: centred across the stage, its top edge 68% down.
 *
 * `top: '68%'` is the button's own top edge, not its centre (issue #191).
 * Centred across with `translateX(-50%)` only — no vertical translate.
 */
export const GATE_ACTION_SX: CSSObject = {
  position: 'absolute',
  left: '50%',
  top: '68%',
  transform: 'translateX(-50%)',
  // Shrink-to-fit rather than the room between `left` and the edge of the
  // stage — a fixed box given `left` and no `right` is otherwise offered that
  // whole width to wrap its label inside before the transform ever recentres
  // it (the trap issue #127 found). Held back to nine tenths of the stage only
  // if a reader's own text size would take it past that.
  width: 'max-content',
  maxWidth: '90vw',
};
