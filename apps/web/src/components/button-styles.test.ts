import { describe, expect, it } from 'vitest';

import { CONTROL, QUIET_CONTROL } from '../garden/scene-palette';
import {
  buttonSx,
  dotSx,
  LOADING_DOT_CLASS,
  SUN_BEAT_MS,
  type ButtonStyleState,
} from './button-styles';

/** An `sx` result, read as a plain object rather than rendered. */
type Sx = Record<string, unknown>;

const asSx = (value: unknown): Sx => value as Sx;

/**
 * Every state this app actually puts a `PillButton` in, named as the issue's
 * own table does. Typed by its keys rather than as `Record<string, ...>`, so
 * each one reads as `ButtonStyleState` on its own rather than
 * `ButtonStyleState | undefined` — the index signature a generic record would
 * need under `noUncheckedIndexedAccess`.
 */
const STATE: {
  readonly primary: ButtonStyleState;
  readonly primaryDisabled: ButtonStyleState;
  readonly primaryLoading: ButtonStyleState;
  readonly quiet: ButtonStyleState;
  readonly quietSmall: ButtonStyleState;
  readonly danger: ButtonStyleState;
  readonly dangerLoading: ButtonStyleState;
} = {
  primary: { kind: 'primary', danger: false, small: false, loading: false, disabled: false },
  primaryDisabled: { kind: 'primary', danger: false, small: false, loading: false, disabled: true },
  primaryLoading: { kind: 'primary', danger: false, small: false, loading: true, disabled: false },
  quiet: { kind: 'quiet', danger: false, small: false, loading: false, disabled: false },
  quietSmall: { kind: 'quiet', danger: false, small: true, loading: false, disabled: false },
  danger: { kind: 'quiet', danger: true, small: false, loading: false, disabled: false },
  dangerLoading: { kind: 'quiet', danger: true, small: false, loading: true, disabled: false },
};

describe('the pill button, in every kind and state this app puts one in', () => {
  it('draws the primary control at rest exactly as design/templates/state-tree.html does (.btn, 477-487)', () => {
    const sx = asSx(buttonSx(STATE.primary));

    expect(sx.backgroundColor).toBe(CONTROL.fill);
    expect(sx.border).toBe(`1.5px solid ${CONTROL.edge}`);
    expect(sx.borderRadius).toBe('999px');
    expect(sx.color).toBe(CONTROL.ink);
    expect(sx.boxShadow).toBe(CONTROL.lift);
    expect(sx.padding).toBe('11px 23px 11px 17px');
    expect(sx.fontSize).toBe('11.5px');
    expect(sx.fontWeight).toBe(700);
    expect(sx.letterSpacing).toBe('0.15em');
    expect(sx.textTransform).toBe('uppercase');
    expect(sx.cursor).toBe('pointer');
    expect(sx.backdropFilter).toBeUndefined();
    // `normal`, unconditionally: a real `<button>` computes this on its own
    // (form controls sit outside the body's line-height inheritance), and
    // this control also renders as `<a>` in three call sites, which does not
    // get that reset — measured taller than the template before this was
    // stated explicitly (`buttonSx`'s own comment, which also has the number).
    expect(sx.lineHeight).toBe('normal');

    const dot = asSx(dotSx(STATE.primary));

    expect(dot.width).toBe('9px');
    expect(dot.height).toBe('9px');
    expect(dot.backgroundColor).toBe(CONTROL.mark);
    expect(dot.boxShadow).toBe(`0 0 0 3px ${CONTROL.markRing}`);
    expect(dot.animation).toBeUndefined();
  });

  it('lifts higher and lights under a finger, on every kind (.btn:hover, 490)', () => {
    // Line 490's `box-shadow` is not overridden by `.btn.quiet:hover` or
    // `.btn.danger:hover` for either property (`button-styles.ts`'s own
    // comment on `hoverOf`), so every kind gets the same bloom.
    for (const [name, state] of Object.entries({
      primary: STATE.primary,
      quiet: STATE.quiet,
      danger: STATE.danger,
    })) {
      const hover = asSx(asSx(buttonSx(state))['&:hover']);

      expect(hover.boxShadow, name).toBe(CONTROL.hoverLift);
    }

    expect(asSx(asSx(buttonSx(STATE.primary))['&:hover']).backgroundColor).toBe(CONTROL.litFill);
    expect(asSx(asSx(buttonSx(STATE.quiet))['&:hover']).backgroundColor).toBe(
      QUIET_CONTROL.hoverFill,
    );
    expect(asSx(asSx(buttonSx(STATE.danger))['&:hover']).backgroundColor).toBe(
      QUIET_CONTROL.dangerHoverFill,
    );
  });

  it('presses down one pixel and shows the gold focus ring, on every kind (491-492)', () => {
    for (const state of [STATE.primary, STATE.quiet, STATE.danger]) {
      const sx = asSx(buttonSx(state));

      expect(asSx(sx['&:active']).transform).toBe('translateY(1px)');
      expect(asSx(sx['&:focus-visible']).outline).toBe(`2px solid ${CONTROL.focusOutline}`);
      expect(asSx(sx['&:focus-visible']).outlineOffset).toBe('3px');
    }
  });

  it('shrinks to the small pill without changing the ring round its dot (.btn.sm, 493-494)', () => {
    const sx = asSx(buttonSx(STATE.quietSmall));

    expect(sx.padding).toBe('9px 18px 9px 14px');
    expect(sx.fontSize).toBe('10.5px');

    const dot = asSx(dotSx(STATE.quietSmall));

    expect(dot.width).toBe('8px');
    expect(dot.height).toBe('8px');
    expect(dot.boxShadow).toBe(`0 0 0 3px ${QUIET_CONTROL.markRing}`);
  });

  it('stands directly on the picture as the quiet kind, blurred (.btn.quiet, 496-498)', () => {
    const sx = asSx(buttonSx(STATE.quiet));

    expect(sx.backgroundColor).toBe(QUIET_CONTROL.fill);
    expect(sx.border).toBe(`1.5px solid ${QUIET_CONTROL.edge}`);
    expect(sx.color).toBe(QUIET_CONTROL.ink);
    expect(sx.backdropFilter).toBe('blur(3px)');

    const dot = asSx(dotSx(STATE.quiet));

    expect(dot.backgroundColor).toBe(QUIET_CONTROL.mark);
    expect(dot.boxShadow).toBe(`0 0 0 3px ${QUIET_CONTROL.markRing}`);
  });

  it('carries the danger edge and ink only over a quiet surface (.btn.danger, 499-501)', () => {
    const sx = asSx(buttonSx(STATE.danger));

    // The fill is still the quiet one — `.btn.danger` never sets `background`.
    expect(sx.backgroundColor).toBe(QUIET_CONTROL.fill);
    expect(sx.border).toBe(`1.5px solid ${QUIET_CONTROL.dangerEdge}`);
    expect(sx.color).toBe(QUIET_CONTROL.dangerInk);

    const dot = asSx(dotSx(STATE.danger));

    // The dot is the one thing danger does put its own colour on, and it
    // shares that colour with the loading dot (`CONTROL.litDot`,
    // `SCENE.vermilionLit`) — the ring stays the quiet one, since
    // `.btn.danger .dot` never mentions `box-shadow`.
    expect(dot.backgroundColor).toBe(CONTROL.litDot);
    expect(dot.boxShadow).toBe(`0 0 0 3px ${QUIET_CONTROL.markRing}`);
  });

  it('turns hollow and casts no shadow once it cannot be pressed (.btn[disabled], 505-510)', () => {
    const sx = asSx(buttonSx(STATE.primaryDisabled));

    expect(sx.backgroundColor).toBe(CONTROL.restingFill);
    expect(sx.border).toBe(`1.5px solid ${CONTROL.restingEdge}`);
    expect(sx.color).toBe(CONTROL.restingInk);
    expect(sx.boxShadow).toBe('none');
    expect(sx.cursor).toBe('not-allowed');
    // `.btn[disabled]:hover` restates the same fill rather than lighting up —
    // modelled here by omitting `&:hover` rather than repeating the colours a
    // second time, which a disabled control can never actually show a reader.
    expect(sx['&:hover']).toBeUndefined();

    const dot = asSx(dotSx(STATE.primaryDisabled));

    expect(dot.backgroundColor).toBe('transparent');
    expect(dot.boxShadow).toBe(`inset 0 0 0 1.5px ${CONTROL.disabledDotRing}`);
  });

  it('turns to the opaque loading surface and beats, regardless of kind (.btn.loading, 512-513)', () => {
    // `create/creating`, `join/joining` and `lobby/starting` all reach this
    // state on a plain primary control.
    const sx = asSx(buttonSx(STATE.primaryLoading));

    expect(sx.backgroundColor).toBe(CONTROL.restingFill);
    expect(sx.border).toBe(`1.5px solid ${CONTROL.loadingEdge}`);
    expect(sx.color).toBe(CONTROL.ink);
    expect(sx.cursor).toBe('progress');
    expect(sx.boxShadow).toBe(CONTROL.lift);
    expect(sx['&:hover']).toBeUndefined();

    const dot = asSx(dotSx(STATE.primaryLoading));

    expect(dot.backgroundColor).toBe(CONTROL.litDot);
    expect(dot.animation).toBe(`sun-beat ${SUN_BEAT_MS}ms cubic-bezier(.3,.6,.3,1) infinite`);
    expect(dot['@keyframes sun-beat']).toBeDefined();
  });

  it('lets loading win the surface over quiet and danger both, on playing/ending', () => {
    // Measured live off the served template rather than derived by hand — see
    // `surfaceOf`'s own comment in `button-styles.ts`. `class="btn quiet
    // danger loading"` (the template's own generator,
    // `btn("Ending the game", "quiet danger loading")`) renders the same
    // opaque loading surface as a plain primary control loading, not the
    // translucent quiet-danger one.
    const loading = asSx(buttonSx(STATE.dangerLoading));
    const primaryLoading = asSx(buttonSx(STATE.primaryLoading));

    expect(loading.backgroundColor).toBe(primaryLoading.backgroundColor);
    expect(loading.border).toBe(primaryLoading.border);
    expect(loading.color).toBe(primaryLoading.color);

    // The dot's ring is the one thing that does not move: neither `.loading`
    // nor `.danger` ever mentions the dot's `box-shadow`, so `.quiet`'s ring
    // survives underneath the loading colour and the beat.
    const dot = asSx(dotSx(STATE.dangerLoading));

    expect(dot.backgroundColor).toBe(CONTROL.litDot);
    expect(dot.boxShadow).toBe(`0 0 0 3px ${QUIET_CONTROL.markRing}`);
    expect(dot.animation).toBe(`sun-beat ${SUN_BEAT_MS}ms cubic-bezier(.3,.6,.3,1) infinite`);
  });

  it('keeps the dot beating under prefers-reduced-motion by a class theme.ts reads', () => {
    // `theme.ts`'s own reduced-motion freeze names `LOADING_DOT_CLASS` out of
    // it the same way it names `CircularProgress` out — see that file's
    // `MuiCssBaseline` override.
    expect(LOADING_DOT_CLASS).toBe('wcg-btn-dot');
  });
});
