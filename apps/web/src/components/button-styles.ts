import type { SxProps, Theme } from '@mui/material/styles';

import { STREET } from '../street';

/** The two kinds the template draws the control in (`.btn` and `.btn.quiet`). */
export type ButtonKind = 'primary' | 'quiet';

/**
 * Every prop {@link buttonSx} and {@link dotSx} need to resolve a look, kept
 * as one shape so the two never drift onto reading different props for the
 * same state.
 */
export interface ButtonStyleState {
  readonly kind: ButtonKind;
  /** The `danger` modifier — meaningful on `quiet` only, per the template. */
  readonly danger: boolean;
  readonly small: boolean;
  readonly loading: boolean;
  readonly disabled: boolean;
}

/**
 * How long the loading dot's own pulse takes, and how many times it repeats.
 *
 * Read here and by `button-styles.test.ts` only — `theme.ts` does not read
 * this number. Its own reduced-motion exemption names the dot out by class
 * (`LOADING_DOT_CLASS` below), not by duration, so the two are held together
 * by which element the freeze skips rather than by a shared constant.
 */
export const SUN_BEAT_MS = 1400;

/** The class name `theme.ts` reads the loading dot out of the reduced-motion freeze by. */
export const LOADING_DOT_CLASS = 'wcg-btn-dot';

/**
 * `sun-beat`, the dot's own pulse: a ring grows out of the dot and fades.
 *
 * The ring takes the dot's own `color` (`currentColor`), so the keyframes name
 * no colour of their own; the movement is the pulse it always was, and it is
 * the motion issue's (#230) to redraw.
 */
const SUN_BEAT_KEYFRAMES = {
  '0%': { boxShadow: '0 0 0 0 currentColor', opacity: 1 },
  '70%': { boxShadow: '0 0 0 9px transparent', opacity: 0.65 },
  '100%': { boxShadow: '0 0 0 0 transparent', opacity: 1 },
} as const;

/**
 * The pill's own padding, gap and label size, at the two sizes the template
 * draws it at (`.btn` and `.btn.sm`, lines 479 and 493-494).
 */
const SIZE = {
  primary: { padding: '11px 23px 11px 17px', fontSize: '11.5px', gap: '10px', dot: '9px' },
  small: { padding: '9px 18px 9px 14px', fontSize: '10.5px', gap: '8px', dot: '8px' },
} as const;

/**
 * The control's fill, edge and label colour, by the role each state plays.
 *
 * `loading` is checked first and, when it is true, decides fill, edge and ink
 * on its own, for every kind: the control that is waiting on a write is the
 * action in progress, whatever it looked like a moment ago. It is the action's
 * spruce with a white label, as `design/templates/state-tree.html` draws it
 * (`.btn.loading`, lines 125-126), and not the disabled fill. The two are not
 * the same state. A control mapped by name instead of by role came out as white
 * on `#BFCBC8`, 1.67:1.
 *
 * The quiet kind is a tile with an ink label, and its `danger` modifier turns
 * the edge and the label brick: brick is text on a tile or on the ground and
 * nowhere else, and a quiet control is a tile.
 */
const surfaceOf = (state: ButtonStyleState) => {
  if (state.loading) {
    return { fill: STREET.spruce, edge: STREET.ink, ink: STREET.onAccent };
  }

  if (state.disabled) {
    return {
      fill: STREET.disabledSurface,
      edge: STREET.disabledRule,
      ink: STREET.disabledLabel,
    };
  }

  if (state.kind === 'quiet') {
    return {
      fill: STREET.tile,
      edge: state.danger ? STREET.brick : STREET.ink,
      ink: state.danger ? STREET.brick : STREET.ink,
    };
  }

  return { fill: STREET.spruce, edge: STREET.ink, ink: STREET.onAccent };
};

/**
 * The fill and edge a resting control turns into under a finger — omitted
 * from the returned style entirely while disabled or loading, so a disabled
 * or loading control stays put under a pointer rather than reacting to one.
 *
 * The action darkens to the theme's own darker shade of spruce (`primary.dark`,
 * which is MUI's, worked out from the token). A quiet control takes the ground's
 * colour under a finger, and a quiet danger control takes `rose` with an ink
 * label: brick is never text on rose (4.31:1), ink is (9.31:1).
 *
 * Hovering a loading control leaves its colours unmoved. That is a known,
 * deliberate difference from the template, which has no `.btn.loading:hover`
 * rule of its own and so lets `.btn:hover` apply to it. No acceptance criterion
 * names hover-while-loading as a state (issue #184, round 2).
 */
const hoverOf = (state: ButtonStyleState) => {
  if (state.kind === 'quiet') {
    return state.danger
      ? { backgroundColor: STREET.rose, color: STREET.ink, borderColor: STREET.brick }
      : { backgroundColor: STREET.duck };
  }

  return { backgroundColor: (theme: Theme) => theme.palette.primary.dark };
};

/**
 * The control itself — `.btn` and every one of its modifiers
 * (`design/templates/state-tree.html` lines 477-518), as one `sx` object.
 *
 * Transitions are the template's own literal values (200 ms/120 ms, `ease`)
 * rather than `motion.ts`'s row: criterion 2 does not hold a transition
 * duration to the template, and copying the template's own numbers here is
 * the more literal reading of "build to the template" for a value nothing
 * else asks this control to share.
 *
 * It casts no shadow. The lift under the pill and the bloom under a finger were
 * there to separate it from a picture, and the ground it stands on now is flat.
 *
 * @param state - Which kind, modifiers and interaction state to draw
 */
export const buttonSx = (state: ButtonStyleState): SxProps<Theme> => {
  const size = state.small ? SIZE.small : SIZE.primary;
  const surface = surfaceOf(state);
  const canHover = !state.disabled && !state.loading;

  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: size.gap,
    padding: size.padding,
    border: `1.5px solid ${surface.edge}`,
    borderRadius: '999px',
    backgroundColor: surface.fill,
    color: surface.ink,
    fontFamily: 'inherit',
    fontSize: size.fontSize,
    fontWeight: 700,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    // `design/templates/state-tree.html` never renders this control as
    // anything but a `<button>` — its own `go()`/`btn()` helpers hand every
    // node a `data-go` attribute and a bit of JS instead of a real link, even
    // for a control that "navigates". A real `<button>` in any browser
    // computes `line-height: normal` regardless of the body's own 1.6
    // (form controls are not part of that inheritance chain), which is what
    // the template's own control is measured at. Three of this app's own
    // instances render as `<a>` for real navigation (`HomePage.tsx`,
    // `RoomUnavailableNotice.tsx`, `NotFoundPage.tsx`), and an anchor has no
    // such reset — it inherits the body's 1.5 like any other element, which
    // measured taller than the template's control before this line was
    // added. Stated here rather than left to each tag's own UA default, so
    // the height is the same 40px a `<button>` and an `<a>` alike, matching
    // the template regardless of which element a given call site needs — 40,
    // not the 42 an earlier measurement of this file once said: that reading
    // was taken before the bold face had finished loading, against
    // the fallback face's own metrics, and 40px is what both sides render at
    // once the real one has.
    lineHeight: 'normal',
    cursor: state.loading ? 'progress' : state.disabled ? 'not-allowed' : 'pointer',
    transition: 'background 200ms ease, transform 120ms ease, border-color 200ms ease',

    ...(canHover && { '&:hover': hoverOf(state) }),
    '&:active': { transform: 'translateY(1px)' },
    // A focus indicator is not drawn for the picture, so it stays: in the
    // action's own colour, on the same offset.
    '&:focus-visible': { outline: `2px solid ${STREET.spruce}`, outlineOffset: '3px' },
  };
};

/**
 * The sun dot before the label — a real element (`components/PillButton.tsx`
 * renders a `<span>`, not a pseudo-element), which is what lets `theme.ts`'s
 * reduced-motion freeze name it out by class: a `*::before` selector cannot be,
 * since the freeze's `:not()` list only ever reaches the plain `*` part of that
 * rule.
 *
 * It is the label's colour, so it is read the way the label is. A control that
 * is loading wears the lit window instead (`ochre`, ringed in ink as the
 * template draws it), and one that cannot be pressed is a hollow ring.
 *
 * @param state - Which kind, modifiers and interaction state to draw
 */
export const dotSx = (state: ButtonStyleState): SxProps<Theme> => {
  const size = state.small ? SIZE.small : SIZE.primary;
  const base = {
    flex: 'none',
    width: size.dot,
    height: size.dot,
    borderRadius: '50%',
    boxSizing: 'border-box',
  } as const;

  if (state.disabled) {
    return {
      ...base,
      backgroundColor: 'transparent',
      border: `1.5px solid ${STREET.disabledLabel}`,
    };
  }

  if (state.loading) {
    return {
      ...base,
      backgroundColor: STREET.ochre,
      color: STREET.ochre,
      border: `1.5px solid ${STREET.ink}`,
      animation: `sun-beat ${SUN_BEAT_MS}ms cubic-bezier(.3,.6,.3,1) infinite`,
      '@keyframes sun-beat': SUN_BEAT_KEYFRAMES,
    };
  }

  return { ...base, backgroundColor: surfaceOf(state).ink };
};
