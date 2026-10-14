import { describe, expect, it } from 'vitest';

import { theme } from '../theme';
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

const { street } = theme.palette;

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

/** The hover fill, which is a function of the theme because MUI works the shade out. */
const hoverFill = (state: ButtonStyleState): string => {
  const fill = asSx(asSx(buttonSx(state))['&:hover']).backgroundColor;

  return String(typeof fill === 'function' ? (fill as (t: typeof theme) => unknown)(theme) : fill);
};

/** A colour as three channels, from `#rrggbb` or from the `rgb(r, g, b)` MUI derives. */
const channelsOf = (colour: string): readonly [number, number, number] => {
  if (colour.startsWith('#')) {
    return [
      parseInt(colour.slice(1, 3), 16),
      parseInt(colour.slice(3, 5), 16),
      parseInt(colour.slice(5, 7), 16),
    ];
  }

  const [red = NaN, green = NaN, blue = NaN] = colour
    .slice(colour.indexOf('(') + 1, colour.lastIndexOf(')'))
    .split(',')
    .map(Number);

  return [red, green, blue];
};

/** WCAG contrast of two opaque colours. */
const contrast = (foreground: string, background: string): number => {
  const luminance = (colour: string): number => {
    const [red, green, blue] = channelsOf(colour).map((channel) => {
      const value = channel / 255;

      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];

    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const one = luminance(foreground);
  const other = luminance(background);

  return (Math.max(one, other) + 0.05) / (Math.min(one, other) + 0.05);
};

describe('the pill button, in every kind and state this app puts one in', () => {
  it('draws the primary control at rest as the action: spruce, a white label, an ink edge', () => {
    const sx = asSx(buttonSx(STATE.primary));

    expect(sx.backgroundColor).toBe(street.spruce);
    expect(sx.border).toBe(`1.5px solid ${street.ink}`);
    expect(sx.color).toBe(street.onAccent);
    expect(sx.borderRadius).toBe('999px');
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
    expect(dot.backgroundColor).toBe(street.onAccent);
    expect(dot.animation).toBeUndefined();
  });

  it('casts no shadow in any state: the lift was for the picture and the picture is gone', () => {
    for (const [name, state] of Object.entries(STATE)) {
      const sx = asSx(buttonSx(state));

      expect(sx.boxShadow, name).toBeUndefined();
      expect(asSx(sx['&:hover'] ?? {}).boxShadow, name).toBeUndefined();
    }
  });

  it('darkens the action under a finger, to the theme’s own shade of spruce', () => {
    expect(hoverFill(STATE.primary)).toBe(theme.palette.primary.dark);
    expect(hoverFill(STATE.primary)).not.toBe(street.spruce);
    // Quiet takes the ground's colour, and a quiet danger takes rose with an
    // ink label: brick is never text on rose (4.31:1), ink is (9.31:1).
    expect(hoverFill(STATE.quiet)).toBe(street.duck);
    expect(hoverFill(STATE.danger)).toBe(street.rose);
    expect(asSx(asSx(buttonSx(STATE.danger))['&:hover']).color).toBe(street.ink);
  });

  it('presses down one pixel and keeps a spruce focus ring, on every kind', () => {
    for (const state of [STATE.primary, STATE.quiet, STATE.danger]) {
      const sx = asSx(buttonSx(state));

      expect(asSx(sx['&:active']).transform).toBe('translateY(1px)');
      expect(asSx(sx['&:focus-visible']).outline).toBe(`2px solid ${street.spruce}`);
      expect(asSx(sx['&:focus-visible']).outlineOffset).toBe('3px');
    }
  });

  it('shrinks to the small pill without changing the dot', () => {
    const sx = asSx(buttonSx(STATE.quietSmall));

    expect(sx.padding).toBe('9px 18px 9px 14px');
    expect(sx.fontSize).toBe('10.5px');

    const dot = asSx(dotSx(STATE.quietSmall));

    expect(dot.width).toBe('8px');
    expect(dot.height).toBe('8px');
  });

  it('is a tile with an ink edge and an ink label as the quiet kind', () => {
    const sx = asSx(buttonSx(STATE.quiet));

    expect(sx.backgroundColor).toBe(street.tile);
    expect(sx.border).toBe(`1.5px solid ${street.ink}`);
    expect(sx.color).toBe(street.ink);
    expect(sx.backdropFilter).toBeUndefined();

    expect(asSx(dotSx(STATE.quiet)).backgroundColor).toBe(street.ink);
  });

  it('carries the danger edge and label only over a quiet tile, in brick', () => {
    const sx = asSx(buttonSx(STATE.danger));

    // Brick is text on a tile or on the ground, and a quiet button is a tile.
    expect(sx.backgroundColor).toBe(street.tile);
    expect(sx.border).toBe(`1.5px solid ${street.brick}`);
    expect(sx.color).toBe(street.brick);
    expect(asSx(dotSx(STATE.danger)).backgroundColor).toBe(street.brick);
  });

  it('turns to the disabled surface and casts nothing once it cannot be pressed', () => {
    const sx = asSx(buttonSx(STATE.primaryDisabled));

    expect(sx.backgroundColor).toBe(street.disabledSurface);
    expect(sx.border).toBe(`1.5px solid ${street.disabledRule}`);
    expect(sx.color).toBe(street.disabledLabel);
    expect(sx.cursor).toBe('not-allowed');
    // Modelled by omitting `&:hover` rather than repeating the colours a
    // second time, which a disabled control can never actually show a reader.
    expect(sx['&:hover']).toBeUndefined();

    const dot = asSx(dotSx(STATE.primaryDisabled));

    expect(dot.backgroundColor).toBe('transparent');
    expect(dot.border).toBe(`1.5px solid ${street.disabledLabel}`);
  });

  it('keeps the action’s spruce and a white label while loading, not the disabled fill', () => {
    // `create/creating`, `join/joining` and `lobby/starting` all reach this
    // state on a plain primary control. Mapped by name it came out as white on
    // `#BFCBC8`, 1.67:1; by role it is the action in progress.
    const sx = asSx(buttonSx(STATE.primaryLoading));

    expect(sx.backgroundColor).toBe(street.spruce);
    expect(sx.backgroundColor).not.toBe(street.disabledSurface);
    expect(sx.color).toBe(street.onAccent);
    expect(sx.border).toBe(`1.5px solid ${street.ink}`);
    expect(sx.cursor).toBe('progress');
    expect(sx['&:hover']).toBeUndefined();

    const dot = asSx(dotSx(STATE.primaryLoading));

    expect(dot.backgroundColor).toBe(street.ochre);
    expect(dot.border).toBe(`1.5px solid ${street.ink}`);
    expect(dot.animation).toBe(`sun-beat ${SUN_BEAT_MS}ms cubic-bezier(.3,.6,.3,1) infinite`);
    expect(dot['@keyframes sun-beat']).toBeDefined();
  });

  it('draws the beat in the dot’s own colour, naming none of its own', () => {
    const keyframes = asSx(asSx(dotSx(STATE.primaryLoading))['@keyframes sun-beat']);

    expect(JSON.stringify(keyframes)).not.toMatch(/#[0-9a-f]{3,8}|rgb|hsl/i);
  });

  it('lets loading win the surface over quiet and danger both, on playing/ending', () => {
    // `class="btn quiet danger loading"` (the template's own generator,
    // `btn("Ending the game", "quiet danger loading")`) renders the same
    // loading surface as a plain primary control loading, not the quiet one.
    const loading = asSx(buttonSx(STATE.dangerLoading));
    const primaryLoading = asSx(buttonSx(STATE.primaryLoading));

    expect(loading.backgroundColor).toBe(primaryLoading.backgroundColor);
    expect(loading.border).toBe(primaryLoading.border);
    expect(loading.color).toBe(primaryLoading.color);

    const dot = asSx(dotSx(STATE.dangerLoading));

    expect(dot.backgroundColor).toBe(street.ochre);
    expect(dot.animation).toBe(`sun-beat ${SUN_BEAT_MS}ms cubic-bezier(.3,.6,.3,1) infinite`);
  });

  it('keeps the dot beating under prefers-reduced-motion by a class theme.ts reads', () => {
    // `theme.ts`'s own reduced-motion freeze names `LOADING_DOT_CLASS` out of
    // it the same way it names `CircularProgress` out — see that file's
    // `MuiCssBaseline` override.
    expect(LOADING_DOT_CLASS).toBe('wcg-btn-dot');
  });
});

describe('the pill button’s label, in every state it can be read in', () => {
  it.each(Object.entries(STATE))('reads at least 4.5:1 when it is %s', (_name, state) => {
    const sx = asSx(buttonSx(state));

    expect(contrast(String(sx.color), String(sx.backgroundColor))).toBeGreaterThanOrEqual(4.5);
  });

  it('reads at least 4.5:1 under a finger as well', () => {
    expect(contrast(street.onAccent, hoverFill(STATE.primary))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(street.ink, hoverFill(STATE.quiet))).toBeGreaterThanOrEqual(4.5);
    // The quiet danger label turns ink on rose, never brick on rose.
    expect(contrast(street.ink, hoverFill(STATE.danger))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(street.brick, street.rose)).toBeLessThan(4.5);
  });
});
