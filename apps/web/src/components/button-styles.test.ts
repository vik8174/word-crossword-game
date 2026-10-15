import { describe, expect, it } from 'vitest';

import { contrastBetween as contrast } from '../contrast';
import { theme } from '../theme';
import { buttonSx, dotSx, PULSE_MS, type ButtonStyleState } from './button-styles';

/** An `sx` result, read as a plain object rather than rendered. */
type Sx = Record<string, unknown>;

const asSx = (value: unknown): Sx => value as Sx;

const { street } = theme.palette;

const STATE: {
  readonly loud: ButtonStyleState;
  readonly quiet: ButtonStyleState;
  readonly link: ButtonStyleState;
  readonly disabled: ButtonStyleState;
  readonly loading: ButtonStyleState;
  readonly quietLoading: ButtonStyleState;
} = {
  loud: { kind: 'loud', loading: false, disabled: false },
  quiet: { kind: 'quiet', loading: false, disabled: false },
  link: { kind: 'link', loading: false, disabled: false },
  disabled: { kind: 'loud', loading: false, disabled: true },
  loading: { kind: 'loud', loading: true, disabled: false },
  quietLoading: { kind: 'quiet', loading: true, disabled: false },
};

describe('the button, in every look this app puts one in', () => {
  it('draws the loud action as the template does: spruce, white 20px bold, 52px, 12px radius', () => {
    const sx = asSx(buttonSx(STATE.loud));

    expect(sx.backgroundColor).toBe(street.spruce);
    expect(sx.color).toBe(street.onAccent);
    expect(sx.fontSize).toBe('1.25rem');
    expect(sx.fontWeight).toBe(700);
    expect(sx.minHeight).toBe('3.25rem');
    expect(sx.borderRadius).toBe('0.75rem');
    expect(sx.boxShadow).toBe(`0 0 0 1.5px ${street.ink}, 3px 3px 0 0 ${street.ink}`);
  });

  it('draws the quiet tile with an ink ring and no offset', () => {
    const sx = asSx(buttonSx(STATE.quiet));

    expect(sx.backgroundColor).toBe(street.tile);
    expect(sx.color).toBe(street.ink);
    expect(sx.boxShadow).toBe(`0 0 0 1.5px ${street.ink}`);
    expect(sx.fontSize).toBe(`${17 / 16}rem`);
    expect(sx.minHeight).toBe('2.75rem');
  });

  it('draws the link as an underlined slate word with no ground and no shadow', () => {
    const sx = asSx(buttonSx(STATE.link));

    expect(sx.backgroundColor).toBe('transparent');
    expect(sx.boxShadow).toBe('none');
    expect(sx.color).toBe(street.slate);
    expect(sx.fontWeight).toBe(400);
    expect(sx.textDecoration).toBe('underline');
    expect(sx.textUnderlineOffset).toBe('4px');
  });

  it('turns to the disabled surface once it cannot be pressed', () => {
    const sx = asSx(buttonSx(STATE.disabled));

    expect(sx.backgroundColor).toBe(street.disabledSurface);
    expect(sx.color).toBe(street.disabledLabel);
    expect(sx.boxShadow).toBe(`0 0 0 1.5px ${street.disabledRule}`);
    expect(sx.cursor).toBe('not-allowed');
  });

  it('keeps the action’s spruce and a white label while loading, not the disabled fill', () => {
    const sx = asSx(buttonSx(STATE.loading));

    expect(sx.backgroundColor).toBe(street.spruce);
    expect(sx.color).toBe(street.onAccent);
    expect(sx.cursor).toBe('progress');
  });

  it('keeps the quiet tile while loading', () => {
    expect(asSx(buttonSx(STATE.quietLoading)).backgroundColor).toBe(street.tile);
  });

  it('has no hover and no press movement until the motion issue (#230)', () => {
    for (const state of Object.values(STATE)) {
      const sx = asSx(buttonSx(state));

      expect(sx['&:hover']).toBeUndefined();
      expect(sx['&:active']).toBeUndefined();
      expect(sx.transition).toBeUndefined();
    }
  });

  it('shows focus as a 3px ochre outline held 4px off', () => {
    expect(asSx(asSx(buttonSx(STATE.loud))['&:focus-visible'])).toEqual({
      outline: `3px solid ${street.ochre}`,
      outlineOffset: '4px',
    });
  });
});

describe('the loading dot', () => {
  it('is ochre, ringed in ink, and beats with pulse over 900ms', () => {
    const dot = asSx(dotSx());

    expect(dot.backgroundColor).toBe(street.ochre);
    expect(dot.boxShadow).toBe(`0 0 0 1.5px ${street.ink}`);
    expect(PULSE_MS).toBe(900);
    expect(dot.animation).toBe('pulse 900ms ease-in-out infinite alternate');
    expect(dot['@keyframes pulse']).toBeDefined();
  });

  it('does not beat under prefers-reduced-motion', () => {
    const dot = asSx(dotSx());

    expect(asSx(dot['@media (prefers-reduced-motion: reduce)']).animation).toBe('none');
  });
});

describe('the button’s label, in every look it can be read in', () => {
  it.each(Object.entries(STATE))('reads at least 4.5:1 when it is %s', (_name, state) => {
    const sx = asSx(buttonSx(state));
    const ground = sx.backgroundColor === 'transparent' ? street.duck : sx.backgroundColor;

    expect(contrast(String(sx.color), String(ground))).toBeGreaterThanOrEqual(4.5);
  });
});
