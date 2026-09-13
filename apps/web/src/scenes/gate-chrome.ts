import type { CSSObject } from '@mui/material/styles';

/**
 * Where the gate's lockup — the name, a rule and the tagline as one block —
 * and its one action sit on the picture.
 *
 * The gate stopped being painted geometry the moment it became `gate.avif`
 * (issue #151). There is no beam or lintel to compute a position from on a
 * photograph: the block's vertical position, `top: 5%`, is a place on *this*
 * picture, measured against the real pixels of `gate.jpg` (issue #151,
 * `handoffs/scenes/README.md`) rather than derived from anything, the same
 * way `GATE_NAME_BAND` and `GATE_TAGLINE_BAND` were before issue #191 folded
 * them into one block.
 *
 * The block's own width, and how it changes on a window narrower than 16:9,
 * is not measured against the pixels here — it is the template's own formula
 * (`design/templates/state-tree.html`, `.lockup.sumi`), which #183 drew and
 * Viktor merged, followed rather than re-derived: `object-fit: cover` fills a
 * narrow window by the picture's height, so the clear sky band the lockup
 * has to stay inside is wider than the window itself, and the block is free
 * to grow with it rather than staying pinned to a share of the window's own
 * width. Where the template writes `cqw` and `cqh`, this writes `vw` and
 * `vh`: the container the template measures against is the full window, and
 * so is `HomePage.tsx`'s own root, `position: fixed; inset: 0`.
 *
 * Everything here is a percentage of the stage — that fixed, full-viewport
 * box — because that is what stays true whatever the window's own aspect
 * ratio crops off the sides of the source image: the stage is exactly the
 * viewport, `object-fit: cover` never leaves a gap in it, and a percentage of
 * it is a percentage a `getBoundingClientRect` reading can be checked against
 * directly.
 */

/** The block's top edge, as a percentage of the stage's height, at every window. */
const LOCKUP_TOP = 5;

/**
 * The block's width when the window is at least as wide as 16:9: a flat
 * share of the stage, the same at every window in that range.
 */
const LOCKUP_WIDE_WIDTH = '52%';

/**
 * The block's width on a window narrower than 16:9, where `object-fit:
 * cover` fills the frame by height rather than by width and the picture's
 * clear sky band — a fixed share of the picture itself — ends up wider than
 * the window. `100vh * 16 / 9` is the picture's own width once it has been
 * scaled to fill the window's height, and 0.52 of that is the same share of
 * the sky band `LOCKUP_WIDE_WIDTH` reads off the window directly at 16:9 and
 * wider. Capped at 92% of the window so the block never touches the edges of
 * a very narrow one.
 */
const LOCKUP_NARROW_WIDTH = 'min(92%, calc(100vh * 16 / 9 * 0.52))';

/**
 * The name's and the rule's shared size, both driving off the same `clamp`
 * so the rule's `margin-top: .28em` scales with the name it sits under. The
 * template's `cqw` written as `vw`, for the reason `LOCKUP_NARROW_WIDTH`'s
 * own comment gives.
 */
export const GATE_LOCKUP_TEXT_SIZE = 'clamp(15px, 2.35vw, 31px)';

/**
 * The ink the lockup is set in: sumi, not the cream the scene's own palette
 * writes on its canopy.
 *
 * Cream fails almost everywhere on this sky — 94% of the band `gate-chrome.ts`
 * used to pin the name to, measured against the real pixels of `gate.jpg`
 * (issue #151). Sumi is what the same measurement clears with room, in the
 * clear band above. It is written as its own literal rather than read off
 * `garden/scene-palette.ts`'s `SCENE.barkDeep` — the two happen to be the same
 * hex, but one is a token of the palette every scene's chrome still shares
 * (`SCENE`, `scene-palette.ts`), and the other is a colour chosen against a
 * photograph that token has nothing to do with; a future scene with a
 * different sky is free to need a different ink without touching either.
 */
export const GATE_INK = '#1C1A1A';

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
  background: GATE_INK,
};

/**
 * Where the one button stands, on the stairs of the gate.
 *
 * Read off the picture rather than off a formula, the same way the lockup
 * is: the torii's posts sit at roughly two fifths and three fifths of the
 * frame's width in the source artwork the shipped images are cut from, and
 * stay there under `object-fit: cover`, because a point at the horizontal
 * middle of a centred cover crop is at the horizontal middle of the viewport
 * whatever the window's own aspect ratio does to the sides.
 *
 * `top: '68%'` is the button's own top edge, not its centre (issue #191):
 * held low enough to stand on the stairs of the gate rather than floating in
 * its opening, where `top: '48%'` with a vertical recentring transform stood
 * it before. Centred across with `translateX(-50%)` only — no vertical
 * translate any more.
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
