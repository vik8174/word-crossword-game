import Box from '@mui/material/Box';
import type { ChangeEvent, ReactNode } from 'react';

import { FIELD_LEAD_CLASS, fieldHelpSx, fieldLeadSx, fieldSetSx, fieldSx } from './field-styles';

export interface FieldProps {
  /**
   * The field's accessible name — given as `aria-label` on the real control,
   * never as text on screen (issue #193, "Decided, not to reopen": "No label
   * on screen"). This is also the template's own choice
   * (`design/templates/state-tree.html`'s `aria-label="Your nickname"` and
   * `aria-label="Words"`), not merely the plainest way to reach the same
   * accessible name — a visually hidden `<label>` would have worked too,
   * and is the reason this stays a plain string rather than a `ReactNode`
   * `Message.tsx`'s `heading` is: nothing here is ever shown.
   */
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** The multi-line kind — `.field.area`, a fixed-height `<textarea>` that scrolls rather than grows. */
  readonly multiline?: boolean;
  readonly invalid?: boolean;
  /** Frozen while the form that holds it is being written — `.field.locked`. */
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly autoFocus?: boolean;
  readonly maxLength?: number;
  /**
   * `id` of the element this field is described by — wired to
   * `aria-describedby` by hand, the way `components/WordListForm.tsx`'s
   * nickname field needs (issue #193's second trap: MUI wired this through
   * its own field component's `helperText` prop, and nothing does that here).
   */
  readonly describedBy?: string;
  readonly id?: string;
}

/**
 * The template's one field — `.field` in `design/templates/state-tree.html`,
 * replacing MUI's own field component in `components/WordListForm.tsx` and
 * `components/JoinRoomForm.tsx` (issue #193). `components/RoomInvitePanel.tsx`
 * keeps MUI's — its readonly zone is a fork the template does not close, and
 * it goes with the lobby issue (#193, "Where it goes" / "Boundaries").
 *
 * Rendered as a real `<label>` wrapping the control, exactly as the template
 * does: clicking anywhere in the pill focuses the input, and the control's
 * own `aria-label` (not this wrapper) is what actually names it, since
 * `aria-label` on a form control always wins over an enclosing `<label>`'s
 * own text — which this one has none of anyway.
 *
 * Not built on MUI's own field component: that draws an outline meant for
 * paper, a floating label this template has none of, and helper text wired
 * through a prop this component does not take. What is kept is a native
 * `<input>`/`<textarea>`, which already gives `:focus-within` (read by
 * `field-styles.ts`'s `fieldSx`), a native `disabled` attribute, and every
 * built-in keyboard behaviour a hand-rolled control would have to
 * reimplement.
 *
 * The lead dot is a real `<span>`, `aria-hidden` and named out of nothing —
 * it adds no word to the accessible name, and reduced motion turns off its
 * 200ms colour change through `theme.ts`'s own blanket freeze, the same way
 * every other transition in a field is (issue #193's tenth trap): unlike
 * `PillButton`'s loading dot, nothing about a field is meant to keep moving
 * once the freeze is on.
 *
 * @param props.label - The accessible name — never shown as text
 * @param props.multiline - The multi-line kind, a fixed three rows that scroll rather than grow
 * @param props.disabled - Frozen while the form that holds it writes
 * @param props.describedBy - `id` of this field's own description, wired to `aria-describedby`
 *
 * @example
 * <Field label="Your nickname" value={nickname} onChange={setNickname} autoFocus />
 */
export const Field = ({
  label,
  value,
  onChange,
  multiline = false,
  invalid = false,
  disabled = false,
  placeholder,
  autoFocus = false,
  maxLength,
  describedBy,
  id,
}: FieldProps) => {
  const state = { multiline, invalid, disabled };
  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange(event.target.value);

  return (
    <Box component="label" sx={fieldSx(state)}>
      <Box aria-hidden className={FIELD_LEAD_CLASS} sx={fieldLeadSx(state)} />
      {multiline ? (
        <Box
          component="textarea"
          id={id}
          rows={3}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={label}
          aria-describedby={describedBy}
          maxLength={maxLength}
        />
      ) : (
        <Box
          component="input"
          type="text"
          id={id}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-label={label}
          aria-describedby={describedBy}
          maxLength={maxLength}
        />
      )}
    </Box>
  );
};

/**
 * The column a {@link Field} and its help line stand in — `.field-set`.
 * `components/JoinRoomForm.tsx`'s field needs none of this (join carries no
 * help line under its field, per issue #193's own measured table), so it
 * renders a bare `Field` and skips this wrapper entirely.
 */
export const FieldSet = ({ children }: { readonly children: ReactNode }) => (
  <Box sx={fieldSetSx}>{children}</Box>
);

/**
 * The help line under a field — `.field-help`, always in full cream on the
 * gate's own band (`field-styles.ts`'s `fieldHelpSx` explains why).
 *
 * @param props.id - Set when a `Field` nearby points `aria-describedby` at this line
 */
export const FieldHelp = ({
  id,
  children,
}: {
  readonly id?: string;
  readonly children: ReactNode;
}) => (
  <Box component="p" id={id} sx={fieldHelpSx}>
    {children}
  </Box>
);
