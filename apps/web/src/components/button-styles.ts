import type { SxProps, Theme } from '@mui/material/styles';

import { inRem } from '../scale';
import { STREET } from '../street';

/**
 * The three looks the control has when it is not busy or disabled: the loud
 * action, the quiet tile, and the link (`.btn`, `.btn.quiet` and `.btn.link` in
 * `design/templates/state-tree.html`, lines 120-132).
 */
export type ButtonKind = 'loud' | 'quiet' | 'link';

/**
 * Every prop {@link buttonSx} and {@link dotSx} need to resolve a look, kept
 * as one shape so the two never drift onto reading different props for the
 * same state.
 */
export interface ButtonStyleState {
  readonly kind: ButtonKind;
  readonly loading: boolean;
  readonly disabled: boolean;
}

/** How long one beat of the loading dot takes (template line 123, `pulse`). */
export const PULSE_MS = 900;

/** The keyframes of `pulse` (template line 125). */
const PULSE_KEYFRAMES = {
  from: { transform: 'scale(.7)', opacity: 0.6 },
  to: { transform: 'scale(1.15)', opacity: 1 },
} as const;

/** The outline round a loud or quiet control, as the template's `0 0 0 1.5px` ring. */
const RING = '1.5px';

/** Under this query the dot is still: it says "busy" by being there (template line 95). */
const REDUCED_MOTION = '@media (prefers-reduced-motion: reduce)';

/**
 * Fill, label and shadow of a control, by the role each state plays.
 *
 * `loading` is checked first: a control waiting on a write is the action in
 * progress, so a loud one keeps the action's spruce and white label rather
 * than the disabled fill (`.btn.loading`), and a quiet one keeps its tile
 * (`.btn.quiet.loading`). The link has no surface to keep.
 */
const surfaceOf = (state: ButtonStyleState) => {
  if (state.kind === 'link') {
    return {
      fill: 'transparent',
      ink: state.disabled && !state.loading ? STREET.disabledLabel : STREET.slate,
      shadow: 'none',
    };
  }

  if (state.disabled && !state.loading) {
    return {
      fill: STREET.disabledSurface,
      ink: STREET.disabledLabel,
      shadow: `0 0 0 ${RING} ${STREET.disabledRule}`,
    };
  }

  if (state.kind === 'quiet') {
    return { fill: STREET.tile, ink: STREET.ink, shadow: `0 0 0 ${RING} ${STREET.ink}` };
  }

  return {
    fill: STREET.spruce,
    ink: STREET.onAccent,
    shadow: `0 0 0 ${RING} ${STREET.ink}, 3px 3px 0 0 ${STREET.ink}`,
  };
};

/** Size, padding and label weight of each kind (template lines 120, 128, 129). */
const SIZE = {
  loud: { fontSize: 20, minHeight: 52, padding: '0 28px', fontWeight: 700 },
  quiet: { fontSize: 17, minHeight: 44, padding: '0 18px', fontWeight: 700 },
  link: { fontSize: 17, minHeight: 44, padding: '0 4px', fontWeight: 400 },
} as const;

/**
 * The control itself, as one `sx` object.
 *
 * It has no hover bloom and no press movement: the lift on hover and the press
 * are the motion issue's (#230). What it keeps is the template's focus ring.
 *
 * @param state - Which kind and interaction state to draw
 */
export const buttonSx = (state: ButtonStyleState): SxProps<Theme> => {
  const size = SIZE[state.kind];
  const surface = surfaceOf(state);

  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: inRem(10),
    border: 0,
    borderRadius: inRem(12),
    backgroundColor: surface.fill,
    boxShadow: surface.shadow,
    color: surface.ink,
    fontFamily: 'inherit',
    fontSize: inRem(size.fontSize),
    fontWeight: size.fontWeight,
    // An anchor inherits the body's line height and a button does not: set,
    // so that both render the template's height.
    lineHeight: 1,
    minHeight: inRem(size.minHeight),
    padding: size.padding,
    whiteSpace: 'nowrap',
    textDecoration: state.kind === 'link' ? 'underline' : 'none',
    ...(state.kind === 'link' && {
      textUnderlineOffset: '4px',
      textDecorationThickness: '1px',
    }),
    cursor: state.loading ? 'progress' : state.disabled ? 'not-allowed' : 'pointer',
    '&:focus-visible': { outline: `3px solid ${STREET.ochre}`, outlineOffset: '4px' },
  };
};

/**
 * The lit dot a loading control shows before its label (`.btn .dot`): ochre,
 * ringed in ink, beating with `pulse`. A control that is not loading has no
 * dot, so `PillButton` does not render one.
 *
 * Under reduced motion it does not beat (template line 95).
 */
export const dotSx = (): SxProps<Theme> => ({
  flex: 'none',
  width: inRem(10),
  height: inRem(10),
  borderRadius: '50%',
  backgroundColor: STREET.ochre,
  boxShadow: `0 0 0 ${RING} ${STREET.ink}`,
  animation: `pulse ${PULSE_MS}ms ease-in-out infinite alternate`,
  '@keyframes pulse': PULSE_KEYFRAMES,
  [REDUCED_MOTION]: { animation: 'none' },
});
