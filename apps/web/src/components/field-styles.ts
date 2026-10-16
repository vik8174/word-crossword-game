import type { SxProps, Theme } from '@mui/material/styles';

import { inRem } from '../scale';
import { STREET } from '../street';

/**
 * The field of design v2 — `.field`, `.field-set`, `.field-fault` and
 * `.field-help` in `design/templates/state-tree.html` (lines 151-164 and
 * 293-295), as `sx` objects.
 *
 * A field is a tile with a 1.5px ink ring drawn as a `box-shadow`, 12px
 * corners and a control that fills it. A field at fault takes a 3px brick ring
 * and carries its fault inside itself, in a strip under the words it is about.
 * Lengths are in `rem` (through {@link inRem}) so that a reader who has made
 * their text larger gets a field that grows with it.
 */

/**
 * Every prop {@link fieldSx} needs to resolve a look, kept as one shape so the
 * field and the control inside it never read different props for one state.
 */
export interface FieldStyleState {
  readonly invalid: boolean;
  /** Frozen while the form that holds it is being written — `.field.locked`. */
  readonly disabled: boolean;
  /** Shows something and takes nothing — `.field.readonly`, the invite link. */
  readonly readOnly?: boolean;
}

/** The ring round a field at rest, and round a field at fault (line 155 and 156). */
const RING = `0 0 0 1.5px ${STREET.ink}`;
const FAULT_RING = `0 0 0 3px ${STREET.brick}`;

/** How faint a frozen field is (`.field.locked`, line 157). */
const LOCKED_OPACITY = 0.75;

/**
 * The field itself and its control — `.field` and `.field input, .field
 * textarea` (lines 153-156).
 *
 * The control carries the padding and the corners, so that the whole field is
 * the target of a click, and the strip under the words (a sibling of the
 * control, inside the field) sits flush against the field's edge.
 *
 * @param state - Which states to draw
 */
export const fieldSx = (state: FieldStyleState): SxProps<Theme> => ({
  display: 'block',
  backgroundColor: STREET.tile,
  borderRadius: inRem(12),
  boxShadow: state.invalid ? FAULT_RING : RING,
  ...(state.disabled && { opacity: LOCKED_OPACITY }),

  // The control stays `inline-block`, as the template's does: a textarea in a
  // block then leaves the few pixels of descender room under it that the
  // drawing has (a field of four rows is 146px, not 138).
  '& input, & textarea': {
    width: '100%',
    boxSizing: 'border-box',
    margin: 0,
    border: 0,
    background: 'transparent',
    font: 'inherit',
    fontSize: inRem(state.readOnly === true ? 17 : 19),
    color: STREET.ink,
    padding: `${inRem(12)} ${inRem(16)}`,
    borderRadius: inRem(12),
    resize: 'vertical',
  },
  // The example in an empty field: slate, which reads 6.23:1 on a tile.
  '& input::placeholder, & textarea::placeholder': { color: STREET.slate, opacity: 1 },
  // The focus ring belongs to the field, not to the control (`.field:has(...)`,
  // line 159): the control is shorter than the field by its descender room, so
  // a ring on it covered the bottom of the ink ring.
  '& input:focus-visible, & textarea:focus-visible': { outline: 'none' },
  '&:has(input:focus-visible), &:has(textarea:focus-visible)': {
    outline: `3px solid ${STREET.ochre}`,
    outlineOffset: '3px',
  },
});

/** The column a label, a field and its help line stand in — `.field-set` (line 151). */
export const fieldSetSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: inRem(6),
  width: '100%',
};

/** The name above a field — `.field-set label` (line 152). */
export const fieldLabelSx: SxProps<Theme> = {
  fontWeight: 700,
  fontSize: inRem(17),
};

/**
 * The help line under a field — `.field-help` (line 158): slate, 15px. It is
 * the same whether or not the field is at fault, because a fault is said inside
 * the field.
 */
export const fieldHelpSx: SxProps<Theme> = {
  display: 'block',
  margin: 0,
  fontSize: inRem(15),
  color: STREET.slate,
};

/**
 * The fault strip, inside the field under the words it is about —
 * `.field .field-fault` and `.field-fault li` (lines 293-295).
 *
 * A 1.5px brick rule above it, a rose fill, ink text 16px, and a bold "×" in
 * front of every line, so that colour never carries a fault alone.
 */
export const fieldFaultSx: SxProps<Theme> = {
  listStyle: 'none',
  margin: 0,
  padding: `${inRem(10)} ${inRem(16)} ${inRem(12)}`,
  borderTop: `1.5px solid ${STREET.brick}`,
  backgroundColor: STREET.rose,
  borderRadius: `0 0 ${inRem(12)} ${inRem(12)}`,
  fontSize: inRem(16),
  color: STREET.ink,
  display: 'flex',
  flexDirection: 'column',
  gap: inRem(4),

  '& li': { display: 'flex', gap: inRem(8), alignItems: 'baseline' },
  '& li::before': { content: '"×"', fontWeight: 700, flex: 'none' },
};
