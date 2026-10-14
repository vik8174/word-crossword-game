import { describe, expect, it } from 'vitest';

import { contrastBetween } from '../contrast';
import { FOCUS_RING } from '../street';
import { theme } from '../theme';
import { fieldHelpSx, fieldLeadSx, fieldSx, type FieldStyleState } from './field-styles';

/** An `sx` result, read as a plain object rather than rendered. */
type Sx = Record<string, unknown>;

const asSx = (value: unknown): Sx => value as Sx;

const { street } = theme.palette;

const STATE: Readonly<Record<'rest' | 'invalid' | 'locked' | 'readOnly', FieldStyleState>> = {
  rest: { multiline: false, invalid: false, disabled: false },
  invalid: { multiline: true, invalid: true, disabled: false },
  locked: { multiline: true, invalid: false, disabled: true },
  readOnly: { multiline: true, invalid: false, disabled: false, readOnly: true },
};

/** What the example in an empty field is drawn in, by state. */
const placeholderOf = (state: FieldStyleState): string =>
  String(asSx(asSx(fieldSx(state))['& input::placeholder, & textarea::placeholder']).color);

describe('the field, in every state this app puts one in', () => {
  it('rests as a tile with a 2px ink edge, and casts no shadow', () => {
    const sx = asSx(fieldSx(STATE.rest));

    expect(sx.backgroundColor).toBe(street.tile);
    expect(sx.border).toBe(`2px solid ${street.ink}`);
    // The lift under the field was for the picture, and the picture is gone.
    expect(sx.boxShadow).toBeUndefined();
  });

  it('takes brick for an edge and rose for a fill when it is at fault', () => {
    const sx = asSx(fieldSx(STATE.invalid));

    expect(sx.border).toBe(`3px solid ${street.brick}`);
    expect(sx.backgroundColor).toBe(street.rose);
    expect(asSx(fieldLeadSx(STATE.invalid)).backgroundColor).toBe(street.brick);
  });

  it('takes spruce for focus, so focus and a fault stay two different things', () => {
    const sx = asSx(fieldSx(STATE.invalid));
    const focus = asSx(sx['&:focus-within']);

    expect(focus.borderColor).toBe(street.spruce);
    expect(focus.boxShadow).toBe(FOCUS_RING);
    expect(focus.borderColor).not.toBe(street.brick);
    expect(asSx(fieldSx(STATE.rest))['&:focus-within']).toEqual(focus);
  });

  it('keeps the three layers the focus ring always had, in the colours of the theme', () => {
    const layers = FOCUS_RING.split(/,\s*(?=\d)/);

    expect(layers).toHaveLength(3);
    // A halo, a glow and a lift: the shape of the ring, whatever it is drawn in.
    expect(layers[0]).toMatch(/^0 0 0 3px /);
    expect(layers[1]).toMatch(/^0 0 18px -2px /);
    expect(layers[2]).toMatch(/^0 8px 22px -12px /);
    expect(FOCUS_RING).toContain(street.spruce);
    expect(FOCUS_RING).toContain(street.ink);
    // Nothing but the two tokens is a colour in it.
    expect(FOCUS_RING.replaceAll(street.spruce, '').replaceAll(street.ink, '')).not.toMatch(
      /#[0-9a-f]{3,8}|rgba?\(/i,
    );
  });

  it('is the disabled surface, label and rule once locked', () => {
    const sx = asSx(fieldSx(STATE.locked));

    expect(sx.backgroundColor).toBe(street.disabledSurface);
    expect(sx.border).toBe(`2px solid ${street.disabledRule}`);
    expect(asSx(sx['& input, & textarea']).color).toBe(street.disabledLabel);
  });

  it('shows a link it is not for typing into on the ground, in a thinner edge', () => {
    const sx = asSx(fieldSx(STATE.readOnly));

    expect(sx.backgroundColor).toBe(street.duck);
    expect(sx.border).toBe(`2px solid ${street.slate}`);
  });

  it('reads the example in an empty field at 4.5:1 or better on every surface it can be on', () => {
    const surfaces = {
      rest: street.tile,
      invalid: street.rose,
      locked: street.disabledSurface,
      readOnly: street.duck,
    } as const;

    for (const [name, state] of Object.entries(STATE)) {
      const surface = surfaces[name as keyof typeof surfaces];

      expect(
        contrastBetween(placeholderOf(state), surface),
        `${name}: ${placeholderOf(state)} on ${surface}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('writes what is typed in ink, or in the disabled label when locked', () => {
    expect(asSx(asSx(fieldSx(STATE.rest))['& input, & textarea']).color).toBe(street.ink);
    expect(asSx(asSx(fieldSx(STATE.invalid))['& input, & textarea']).color).toBe(street.ink);
    expect(contrastBetween(street.ink, street.rose)).toBeGreaterThanOrEqual(4.5);
  });

  it('says its help in secondary text, which reads 4.5:1 on a tile', () => {
    expect(asSx(fieldHelpSx).color).toBe(street.slate);
    expect(contrastBetween(street.slate, street.tile)).toBeGreaterThanOrEqual(4.5);
  });
});
