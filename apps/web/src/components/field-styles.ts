import type { SxProps, Theme } from '@mui/material/styles';

import { FIELD, SCENE } from '../garden/scene-palette';

/**
 * Every prop {@link fieldSx} and {@link fieldLeadSx} need to resolve a look,
 * kept as one shape for the same reason `button-styles.ts`'s
 * `ButtonStyleState` is: the two must never drift onto reading different
 * props for the same state.
 */
export interface FieldStyleState {
  readonly multiline: boolean;
  readonly invalid: boolean;
  readonly disabled: boolean;
}

/** The class the lead dot is found by from inside {@link fieldSx}'s own `:focus-within` rule. */
export const FIELD_LEAD_CLASS = 'wcg-field-lead';

/**
 * The size the field's own text is set at — 13.5px, not one of `scale.ts`'s
 * four levels, the same way the button's 11.5px and the message's 12.5px
 * are not: the template's own value, written here rather than added as a
 * fifth level nothing else in the app is drawn at.
 */
const FIELD_FONT_SIZE = '13.5px';

/**
 * The field itself — `.field` and every one of its modifiers
 * (`design/templates/state-tree.html` lines 533-554) — as one `sx` object.
 *
 * Border width is worked out from `invalid` alone and border colour from the
 * fuller cascade (`disabled` first, then `invalid`, then rest), because that
 * is what the template's own two classes actually do when both could apply
 * at once: `.locked` (declared after `.invalid`) overrides the colour but
 * never restates a width, so a field that were somehow both would keep the
 * invalid width in the locked colour. Nothing in this app renders that
 * combination today — a field is frozen only once its list has already
 * passed validation — but the two are computed independently anyway rather
 * than short-circuited on `disabled`, so the rule stays correct if that ever
 * changes rather than merely convenient today.
 *
 * @param state - Which kind and which states to draw
 */
export const fieldSx = (state: FieldStyleState): SxProps<Theme> => {
  const borderWidth = state.invalid ? 3 : 2;
  const borderColor = state.disabled
    ? FIELD.lockedEdge
    : state.invalid
      ? SCENE.vermilion
      : FIELD.ink;

  return {
    display: 'flex',
    alignItems: state.multiline ? 'flex-start' : 'center',
    gap: '10px',
    width: '100%',
    padding: state.multiline ? '12px 16px' : '10px 16px',
    backgroundColor: state.disabled
      ? FIELD.lockedFill
      : state.invalid
        ? FIELD.invalidFill
        : FIELD.fill,
    border: `${borderWidth}px solid ${borderColor}`,
    borderRadius: state.multiline ? '14px' : '999px',
    boxShadow: state.disabled ? 'none' : FIELD.lift,
    cursor: state.disabled ? 'default' : 'text',
    transition: 'box-shadow 200ms ease, border-color 200ms ease, background 200ms ease',

    '&:focus-within': {
      borderColor: SCENE.vermilion,
      boxShadow: FIELD.focusRing,
    },
    [`&:focus-within .${FIELD_LEAD_CLASS}`]: { backgroundColor: SCENE.vermilion },

    // Padding and margin are the browser's own defaults for a text control,
    // not reset to zero: the template's own `.field input, .field textarea`
    // rule (line 540) does not reset them either, and a single-line field's
    // own height is `line-height: normal`'s alone, with nothing else fixing
    // it — reset the UA padding to nought here and the field measures 2px
    // shorter than the template everywhere a criterion checks it. `.area`'s
    // `min-height: 74px` is what keeps the multi-line kind from needing this
    // same care: it fixes the outer box directly, so the UA's own padding
    // inside it changes nothing this app measures.
    '& input, & textarea': {
      flex: 1,
      minWidth: 0,
      border: 0,
      background: 'transparent',
      outline: 'none',
      fontFamily: 'inherit',
      fontSize: FIELD_FONT_SIZE,
      letterSpacing: '0.08em',
      color: state.disabled ? FIELD.lockedInk : FIELD.ink,
      resize: 'none',
      ...(state.multiline && { minHeight: '74px', lineHeight: 1.55 }),
    },
    '& input::placeholder, & textarea::placeholder': {
      color: FIELD.placeholder,
      opacity: 1,
    },
  };
};

/**
 * The lead dot before the text — decorative, `aria-hidden` in
 * `components/Field.tsx` — at its size, colour and the one motion it carries.
 *
 * @param state - Which kind and which states to draw
 */
export const fieldLeadSx = (state: FieldStyleState): SxProps<Theme> => ({
  flex: 'none',
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: state.invalid ? SCENE.vermilion : FIELD.dot,
  transition: 'background 200ms ease',
  ...(state.multiline && { marginTop: '5px' }),
});

/**
 * The column a field and its help line stand in — `.field-set`
 * (`design/templates/state-tree.html` line 532), six pixels apart.
 *
 * A word list keeps two help lines rather than the template's one (the
 * words the app says and how many it says them in is the create panel
 * issue's, per issue #193's "Decided, not to reopen") — both stack in this
 * same column at the same six-pixel gap, since nothing narrower is asked of
 * a second line than of the first.
 */
export const fieldSetSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  width: '100%',
};

/**
 * The help line under a field — `.field-help`
 * (`design/templates/state-tree.html` line 556) — always in full cream
 * rather than switching to `.field-help.bad`'s `#FFC7AE` for a fault.
 *
 * Every field this issue builds stands on the gate's own band, where help is
 * full cream regardless of severity — a decision #190 already made and this
 * issue only carries forward (issue #193, "Decided, not to reopen"; the
 * template's own comment at line 558-564 explains why `#FFC7AE` fails the
 * same measurement there). A fault is still said two other ways without the
 * colour: `WordListForm`'s field doubles its border, and its sentence
 * changes to name what is wrong.
 */
export const fieldHelpSx: SxProps<Theme> = {
  display: 'block',
  margin: 0,
  fontSize: '10.5px',
  lineHeight: 1.5,
  paddingLeft: '16px',
  color: SCENE.cream,
};
