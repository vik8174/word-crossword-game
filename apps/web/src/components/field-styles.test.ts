import { describe, expect, it } from 'vitest';

import { contrastBetween } from '../contrast';
import { theme } from '../theme';
import { fieldFaultSx, fieldHelpSx, fieldSx, type FieldStyleState } from './field-styles';

/** An `sx` result, read as a plain object rather than rendered. */
type Sx = Record<string, unknown>;

const asSx = (value: unknown): Sx => value as Sx;

const { street } = theme.palette;

const STATE: Readonly<Record<'rest' | 'invalid' | 'locked' | 'readOnly', FieldStyleState>> = {
  rest: { invalid: false, disabled: false },
  invalid: { invalid: true, disabled: false },
  locked: { invalid: false, disabled: true },
  readOnly: { invalid: false, disabled: false, readOnly: true },
};

describe('the field of design v2, in every state this app puts one in', () => {
  it('rests as a tile with a 1.5px ink ring and 12px corners', () => {
    const sx = asSx(fieldSx(STATE.rest));

    expect(sx.backgroundColor).toBe(street.tile);
    expect(sx.boxShadow).toBe(`0 0 0 1.5px ${street.ink}`);
    expect(sx.borderRadius).toBe('0.75rem');
  });

  it('is ringed in 3px brick when it is at fault, and keeps its fill', () => {
    const sx = asSx(fieldSx(STATE.invalid));

    expect(sx.boxShadow).toBe(`0 0 0 3px ${street.brick}`);
    expect(sx.backgroundColor).toBe(street.tile);
  });

  it('goes faint once locked', () => {
    expect(asSx(fieldSx(STATE.locked)).opacity).toBe(0.75);
    expect(asSx(fieldSx(STATE.rest)).opacity).toBeUndefined();
  });

  it('writes the control at 19px, and the invite link at 17px', () => {
    const control = (state: FieldStyleState) =>
      asSx(asSx(fieldSx(state))['& input, & textarea']).fontSize;

    expect(control(STATE.rest)).toBe(`${19 / 16}rem`);
    expect(control(STATE.readOnly)).toBe(`${17 / 16}rem`);
  });

  it('reads the example in an empty field at 4.5:1 or better on a tile', () => {
    const placeholder = asSx(
      asSx(fieldSx(STATE.rest))['& input::placeholder, & textarea::placeholder'],
    );

    expect(placeholder.color).toBe(street.slate);
    expect(contrastBetween(street.slate, street.tile)).toBeGreaterThanOrEqual(4.5);
  });

  it('says its help in secondary text, which reads 4.5:1 on the ground', () => {
    expect(asSx(fieldHelpSx).color).toBe(street.slate);
    expect(contrastBetween(street.slate, street.duck)).toBeGreaterThanOrEqual(4.5);
  });

  it('draws the strip on rose with a brick rule above it, and ink text that reads 4.5:1', () => {
    const sx = asSx(fieldFaultSx);

    expect(sx.backgroundColor).toBe(street.rose);
    expect(sx.borderTop).toBe(`1.5px solid ${street.brick}`);
    expect(sx.color).toBe(street.ink);
    expect(contrastBetween(street.ink, street.rose)).toBeGreaterThanOrEqual(4.5);
  });
});
