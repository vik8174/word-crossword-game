import type { CSSObject } from '@mui/material/styles';

import { SCENE } from '../garden/scene-palette';
import { inRem } from '../scale';

/**
 * How long one ring of the waiting mark takes to grow out and fade, and how
 * far the second and third are behind the one before.
 *
 * Read here and by `WaitingMark.test.tsx` only; `theme.ts` names the rings out
 * of the reduced-motion freeze by class ({@link WAIT_RING_CLASS}) and not by
 * duration, the way it does the button's dot. The delays are a third of the
 * period each, which is what keeps one ring always on its way out.
 */
export const SUN_OUT_MS = 1900;
export const SUN_OUT_DELAYS_MS = [0, 633, 1266] as const;

/**
 * The class `theme.ts` names the rings out of the reduced-motion freeze by.
 *
 * A stopped ring reads as a stalled screen, the reason the spinner and the
 * button's dot are exempt too. Note that the template's own reduced-motion rule
 * gives these rings 1400ms, the dot's duration written into a second selector
 * (`design/templates/state-tree.html` line 738); this one keeps its own 1900
 * whatever the reader asked for, which is the one allowed difference the issue
 * names (#198).
 */
export const WAIT_RING_CLASS = 'wcg-wait-ring';

/** `sun-out`, one ring's growth: `state-tree.html` lines 526-530, unchanged. */
const SUN_OUT_KEYFRAMES = {
  '0%': { transform: 'scale(0.25)', opacity: 0 },
  '28%': { opacity: 0.9 },
  '100%': { transform: 'scale(1)', opacity: 0 },
} as const;

/**
 * `.sun-wait`: the mark and its sentence on one line, 14px apart.
 *
 * As wide as what is in it and centred by its own margins, which is what the
 * template's `inline-flex` in a centred column comes to, and is why its box is
 * the line itself (189.3 by 26 at 1440) and not the width of the panel round it.
 */
export const waitingLineSx: CSSObject = {
  display: 'flex',
  width: 'fit-content',
  maxWidth: '100%',
  margin: '0 auto',
  alignItems: 'center',
  gap: inRem(14),
  color: SCENE.cream,
  fontSize: inRem(13),
};

/** `.sun-wait .ring`: the 26px square the three rings and the core stand in. */
export const waitingRingSx: CSSObject = {
  position: 'relative',
  width: inRem(26),
  height: inRem(26),
  flex: 'none',
};

/** `.sun-wait .ring i`: one ring, growing out from the core. */
export const ringSx = (delayMs: number): CSSObject => ({
  position: 'absolute',
  inset: 0,
  borderRadius: '50%',
  border: `2px solid ${SCENE.vermilionLit}`,
  opacity: 0,
  animation: `sun-out ${SUN_OUT_MS}ms cubic-bezier(.2,.7,.3,1) infinite`,
  animationDelay: `${delayMs}ms`,
  '@keyframes sun-out': SUN_OUT_KEYFRAMES,
});

/** `.sun-wait .core`: the 8px sun the rings leave from. */
export const coreSx: CSSObject = {
  position: 'absolute',
  inset: inRem(9),
  borderRadius: '50%',
  backgroundColor: SCENE.vermilion,
};
