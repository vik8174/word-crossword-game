import type { CSSObject } from '@mui/material/styles';

/**
 * Where the gate's own lockup and its one action sit on the picture.
 *
 * The gate stopped being painted geometry the moment it became `gate.avif`
 * (issue #151). The previous version of this file computed the name's position
 * from the procedurally-drawn world — `lintel.y / 2`, halfway between the top
 * of the window and the beam of a torii `paint-scene.ts` was drawing. On a
 * photograph there is no beam to be halfway above: `LANDMARKS.gate` and
 * `frameFor` describe a world this route no longer paints, so a formula built
 * on them would be arithmetic over numbers that mean nothing here.
 *
 * What replaces it is not a formula at all. The bands below are a place on
 * *this* picture, measured against the real pixels of `gate.jpg` (issue #151,
 * `handoffs/scenes/README.md`) rather than derived from anything: sumi text
 * clears 4.5:1 in the clear sky between roughly a twentieth and a tenth of the
 * frame down, and nowhere close to that once the torii's beam or its shadowed
 * uprights get involved. A different picture would need different numbers, not
 * a different formula.
 *
 * Everything here is a percentage of the stage — the fixed, full-viewport box
 * `HomePage.tsx` draws the picture in — because that is what stays true
 * whatever the window's own aspect ratio crops off the sides of the source
 * image: the stage is exactly the viewport, `object-fit: cover` never leaves a
 * gap in it, and a percentage of it is a percentage a
 * `getBoundingClientRect` reading can be checked against directly.
 */

/** The vertical band the name may occupy, as a percentage of the stage's height. */
export const GATE_NAME_BAND = { top: 5.0, bottom: 10.1 } as const;

/**
 * The vertical band the tagline may occupy, once #148 gives the gate one to
 * show. Measured on the same picture and already reserved so that a second
 * line does not have to be fitted in later.
 */
export const GATE_TAGLINE_BAND = { top: 12.5, bottom: 15.1 } as const;

/** How far in from each side of the stage the lockup may reach, either line. */
export const GATE_LOCKUP_X = { left: 24, right: 77 } as const;

/**
 * The ink the lockup is set in: sumi, not the cream the painted garden writes
 * on its own canopy.
 *
 * Cream fails almost everywhere on this sky — 94% of the band `gate-chrome.ts`
 * used to pin the name to, measured against the real pixels of `gate.jpg`
 * (issue #151). Sumi is what the same measurement clears with room, in the
 * clear band above. It is written as its own literal rather than read off
 * `garden/scene-palette.ts`'s `SCENE.barkDeep` — the two happen to be the same
 * hex, but one is a token of the forest the procedural garden still paints for
 * every other screen, and the other is a colour chosen against a photograph
 * that palette has nothing to do with; a future scene with a different sky is
 * free to need a different ink without touching either.
 */
export const GATE_INK = '#1C1A1A';

/**
 * A share of the stage, to one decimal place.
 *
 * The bands are measured to a tenth of a per cent, and plain floating-point
 * subtraction does not stay there — `15.1 - 12.5` is `2.5999999999999996` in
 * IEEE 754, which would write a CSS value nobody chose and a test nobody could
 * write a round number against. Fixed to one decimal rather than left exact,
 * because one decimal is the precision the measurement itself was made to.
 *
 * @param value - The number of percentage points
 * @returns It as a CSS percentage
 */
const pct = (value: number): string => `${value.toFixed(1)}%`;

/** One band, as the absolutely-positioned box that holds whatever stands in it. */
const bandSx = (band: { readonly top: number; readonly bottom: number }): CSSObject => ({
  position: 'absolute',
  top: pct(band.top),
  height: pct(band.bottom - band.top),
  left: pct(GATE_LOCKUP_X.left),
  width: pct(GATE_LOCKUP_X.right - GATE_LOCKUP_X.left),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  pointerEvents: 'none',
});

/** Where the name goes, against the stage. */
export const GATE_NAME_SX: CSSObject = bandSx(GATE_NAME_BAND);

/** Where the tagline goes, against the stage. */
export const GATE_TAGLINE_SX: CSSObject = bandSx(GATE_TAGLINE_BAND);

/**
 * Where the one button stands, in the opening of the gate.
 *
 * Read off the picture rather than off a formula, the same way the lockup is:
 * the torii's posts sit at roughly two fifths and three fifths of the frame's
 * width in the source artwork the shipped images are cut from, and stay there
 * under `object-fit: cover`, because a
 * point at the horizontal middle of a centred cover crop is at the horizontal
 * middle of the viewport whatever the window's own aspect ratio does to the
 * sides. Held a little above the temple's stairs rather than the middle of the
 * opening, which is where a button reads as standing in the gate rather than
 * floating over the roofline behind it.
 */
export const GATE_ACTION_SX: CSSObject = {
  position: 'absolute',
  left: '50%',
  top: '48%',
  transform: 'translate(-50%, -50%)',
  // Shrink-to-fit rather than the room between `left` and the edge of the
  // stage — a fixed box given `left` and no `right` is otherwise offered that
  // whole width to wrap its label inside before the transform ever recentres
  // it (the trap issue #127 found). Held back to nine tenths of the stage only
  // if a reader's own text size would take it past that.
  width: 'max-content',
  maxWidth: '90vw',
};
