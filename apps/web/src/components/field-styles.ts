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
  /**
   * Shows something and takes nothing — `.field.readonly`, the invite link
   * (issue #199). It is always the multi-line kind, because a link is shown in
   * full and grows to as many lines as it needs; `multiline` is set beside it.
   */
  readonly readOnly?: boolean;
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
 * A read-only field's fill and edge (`.field.readonly`,
 * `design/templates/state-tree.html` lines 554-555): the washi a little more
 * transparent, and an edge that is not the ink's full strength, because
 * nothing is to be typed into it and it should not look as though there were.
 */
export const READONLY_FILL = 'rgba(242, 231, 208, 0.9)';
const READONLY_EDGE = 'rgba(43, 38, 32, 0.35)';

/** A read-only field's tracking, tighter than the rest so a long link takes fewer lines (`.field.readonly input`). */
const READONLY_TRACKING = '0.03em';

/** A multi-line field's line, as tall as `fieldSx` sets its control. */
const MULTILINE_LINE_HEIGHT = 1.55;

/** The field's fill, `disabled` first and then `invalid`, as the template's classes cascade. */
const fillFor = (state: FieldStyleState): string => {
  if (state.disabled) {
    return FIELD.lockedFill;
  }

  if (state.invalid) {
    return FIELD.invalidFill;
  }

  return state.readOnly === true ? READONLY_FILL : FIELD.fill;
};

/** The field's edge, in the same order as {@link fillFor}. */
const edgeFor = (state: FieldStyleState): string => {
  if (state.disabled) {
    return FIELD.lockedEdge;
  }

  if (state.invalid) {
    return SCENE.vermilion;
  }

  return state.readOnly === true ? READONLY_EDGE : FIELD.ink;
};

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
  const borderColor = edgeFor(state);

  return {
    // Positioned, not static, so the field paints above any absolutely
    // positioned band drawn earlier in the same parent: a static element there
    // paints underneath it. `join` was the screen that showed it, standing on
    // the gate's band, where without this the field read the band's dimmed
    // colour instead of the washi fill (issue #193 round 1). `join` stands on a
    // panel of its own now (issue #198, `MiddlePanel`), and the rule stays
    // because it costs nothing and MUI's own field carried it too.
    position: 'relative',
    display: 'flex',
    alignItems: state.multiline ? 'flex-start' : 'center',
    gap: '10px',
    width: '100%',
    padding: state.multiline ? '12px 16px' : '10px 16px',
    backgroundColor: fillFor(state),
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
      letterSpacing: state.readOnly === true ? READONLY_TRACKING : '0.08em',
      color: state.disabled ? FIELD.lockedInk : FIELD.ink,
      resize: 'none',
      ...(state.multiline && { minHeight: '74px', lineHeight: MULTILINE_LINE_HEIGHT }),
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
 * Every field this issue builds stands on the gate's own surface, where help is
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

/**
 * The box a read-only field's control stands in, so that the control is as
 * tall as its text and never scrolls (issue #199).
 *
 * The template draws a link that is clipped at every width, and the app shows
 * it in full (#101), so the field has to grow. A `<textarea>` does not, and
 * `field-sizing: content` is not there in every browser this is played in, so
 * the height is asked of the text itself: a copy of the value is drawn, hidden,
 * in the same grid cell, with the same face, tracking and line, and the cell is
 * as tall as whichever of the two is taller. The control fills the cell. No
 * script measures anything, so nothing is a frame late on a resize or on the
 * face arriving.
 *
 * Padding and margin are nought on the control here and on the copy, because a
 * browser's own 2px would make the two wrap at different widths. `minHeight` on
 * the control is still `fieldSx`'s 74px, which is what gives a short link the
 * same field as a multi-line one everywhere else.
 */
export const fieldGrowSx: SxProps<Theme> = {
  display: 'grid',
  // One column that may be narrower than its text: left to `auto` it is as wide
  // as the whole link on one line, and the control with it.
  gridTemplateColumns: 'minmax(0, 1fr)',
  flex: 1,
  minWidth: 0,
  fontSize: FIELD_FONT_SIZE,
  letterSpacing: READONLY_TRACKING,
  lineHeight: MULTILINE_LINE_HEIGHT,

  '&::after': {
    // The value plus a space, so a value that ends in a line break still
    // reserves the line it ends on.
    content: 'attr(data-value) " "',
    visibility: 'hidden',
    gridArea: '1 / 1',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
  },
  '& textarea': {
    gridArea: '1 / 1',
    alignSelf: 'stretch',
    width: '100%',
    margin: 0,
    padding: 0,
    overflow: 'hidden',
  },
};
