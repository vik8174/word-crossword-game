import type { SxProps, Theme } from '@mui/material/styles';

import { CONTROL, QUIET_CONTROL } from '../garden/scene-palette';

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
 * `sun-beat`, the dot's own pulse — `design/templates/state-tree.html` lines
 * 514-518, unchanged.
 */
const SUN_BEAT_KEYFRAMES = {
  '0%': { boxShadow: '0 0 0 0 rgba(242, 118, 47, 0.6)', opacity: 1 },
  '70%': { boxShadow: '0 0 0 9px rgba(242, 118, 47, 0)', opacity: 0.65 },
  '100%': { boxShadow: '0 0 0 0 rgba(242, 118, 47, 0)', opacity: 1 },
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
 * The control's fill, edge and label colour, resolved the way the template's
 * own cascade resolves them rather than guessed at.
 *
 * `loading` is checked first and, when it is true, decides fill, edge and ink
 * on its own — not because the other modifiers stop applying, but because
 * they measurably do not win. `design/templates/state-tree.html`'s
 * `.btn.loading` rule is declared after `.btn.quiet` and `.btn.danger` at the
 * same specificity (two classes each), so on `playing/ending` — `class="btn
 * quiet danger loading"` (`btn("Ending the game", "quiet danger loading")`,
 * the template's own generator) — the rendered control is the opaque
 * `vermilion-deep` loading surface, not the translucent quiet-danger one.
 * Measured live off the served template (`getComputedStyle`) rather than
 * assumed from the cascade rules on paper, because a hand-derivation of three
 * overlapping selectors is exactly the kind of thing worth checking against
 * the browser that actually resolves them. The issue's own prose calls this
 * state "the loading dot and cursor: progress on the quiet danger surface",
 * which reads as the surface staying quiet-danger — the template it cites
 * draws otherwise, and the template is what an AFK issue settles the look
 * with.
 */
const surfaceOf = (state: ButtonStyleState) => {
  if (state.loading) {
    return { fill: CONTROL.restingFill, edge: CONTROL.loadingEdge, ink: CONTROL.ink };
  }

  if (state.disabled) {
    return { fill: CONTROL.restingFill, edge: CONTROL.restingEdge, ink: CONTROL.restingInk };
  }

  if (state.kind === 'quiet') {
    return {
      fill: QUIET_CONTROL.fill,
      edge: state.danger ? QUIET_CONTROL.dangerEdge : QUIET_CONTROL.edge,
      ink: state.danger ? QUIET_CONTROL.dangerInk : QUIET_CONTROL.ink,
    };
  }

  return { fill: CONTROL.fill, edge: CONTROL.edge, ink: CONTROL.ink };
};

/**
 * The fill and edge a resting control turns into under a finger — omitted
 * from the returned style entirely while disabled or loading, so a disabled
 * or loading control stays put under a pointer rather than reacting to one.
 *
 * This matches the template for `disabled`: `.btn[disabled]:hover` restates
 * the same resting colours rather than lighting up. It does not match the
 * template for `loading`. The template has no `.btn.loading:hover` rule of
 * its own, but that does not mean hovering a loading control leaves it
 * unmoved — `.btn:hover`'s `background`/`box-shadow` are not overridden by
 * `.loading`, so they still apply on a real hover: `create/creating` gains
 * the gold bloom, and `playing/ending` turns `rgba(147, 41, 15, 0.72)` with
 * edge `#F2762F`, measured live on the served template. This control leaves
 * a loading control's colours unmoved on hover instead, which is a known,
 * deliberate difference from the template rather than an oversight — no
 * acceptance criterion names hover-while-loading as a state, and whether the
 * template's own hover-while-loading is itself intended or a cascade
 * accident is an open question for the Architect (issue #184, round 2).
 * Change this only once that question is settled.
 */
const hoverOf = (
  state: ButtonStyleState,
): { backgroundColor: string; borderColor: string; boxShadow: string } => {
  // The bloom is the one hover figure every kind shares — the template's own
  // `.btn:hover` rule, which nothing more specific overrides for `box-shadow`
  // on `.quiet` or `.danger` alike (neither rule mentions the property).
  const boxShadow = CONTROL.hoverLift;

  if (state.kind === 'quiet') {
    return {
      backgroundColor: state.danger ? QUIET_CONTROL.dangerHoverFill : QUIET_CONTROL.hoverFill,
      borderColor: state.danger ? QUIET_CONTROL.dangerHoverEdge : QUIET_CONTROL.hoverEdge,
      boxShadow,
    };
  }

  return { backgroundColor: CONTROL.litFill, borderColor: CONTROL.edge, boxShadow };
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
    // was taken before Zen Kaku Gothic New Bold had finished loading, against
    // the fallback face's own metrics, and 40px is what both sides render at
    // once the real one has.
    lineHeight: 'normal',
    cursor: state.loading ? 'progress' : state.disabled ? 'not-allowed' : 'pointer',
    boxShadow: state.disabled ? 'none' : CONTROL.lift,
    transition:
      'background 200ms ease, box-shadow 200ms ease, transform 120ms ease, border-color 200ms ease',
    ...(state.kind === 'quiet' && {
      backdropFilter: 'blur(3px)',
      WebkitBackdropFilter: 'blur(3px)',
    }),

    ...(canHover && { '&:hover': hoverOf(state) }),
    '&:active': { transform: 'translateY(1px)' },
    '&:focus-visible': { outline: `2px solid ${CONTROL.focusOutline}`, outlineOffset: '3px' },
  };
};

/**
 * The sun dot before the label — a real element (`components/PillButton.tsx`
 * renders a `<span>`, not the pseudo-element `garden/scene-surface.ts` used to
 * draw), which is what lets `theme.ts`'s reduced-motion freeze name it out by
 * class: a `*::before` selector cannot be, since the freeze's `:not()` list
 * only ever reaches the plain `*` part of that rule.
 *
 * @param state - Which kind, modifiers and interaction state to draw
 */
export const dotSx = (state: ButtonStyleState): SxProps<Theme> => {
  const size = state.small ? SIZE.small : SIZE.primary;

  if (state.disabled) {
    return {
      flex: 'none',
      width: size.dot,
      height: size.dot,
      borderRadius: '50%',
      backgroundColor: 'transparent',
      boxShadow: `inset 0 0 0 1.5px ${CONTROL.disabledDotRing}`,
    };
  }

  const isLit = state.loading || (state.kind === 'quiet' && state.danger);
  const color = isLit ? CONTROL.litDot : state.kind === 'quiet' ? QUIET_CONTROL.mark : CONTROL.mark;
  const ring = state.kind === 'quiet' ? QUIET_CONTROL.markRing : CONTROL.markRing;

  return {
    flex: 'none',
    width: size.dot,
    height: size.dot,
    borderRadius: '50%',
    backgroundColor: color,
    boxShadow: `0 0 0 3px ${ring}`,
    ...(state.loading && {
      animation: `sun-beat ${SUN_BEAT_MS}ms cubic-bezier(.3,.6,.3,1) infinite`,
      '@keyframes sun-beat': SUN_BEAT_KEYFRAMES,
    }),
  };
};
