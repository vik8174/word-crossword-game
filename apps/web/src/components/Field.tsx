import Box from '@mui/material/Box';
import { type ChangeEvent, useId } from 'react';

import { fieldFaultSx, fieldHelpSx, fieldLabelSx, fieldSetSx, fieldSx } from './field-styles';

export interface FieldProps {
  /** The name shown above the field, and the control's accessible name. */
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** The multi-line kind, four rows that the reader may drag taller. */
  readonly multiline?: boolean;
  /** Frozen while the form that holds it is being written — `.field.locked`. */
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly autoFocus?: boolean;
  readonly maxLength?: number;
  readonly id?: string;
  /** The line under the field, in slate. */
  readonly help?: string;
  /**
   * What is wrong with the field, one sentence per line. While there are any,
   * the field is ringed in brick, carries them in a strip under its words, and
   * the control is `aria-invalid` and described by the strip.
   */
  readonly faults?: readonly string[];
  /** Tells whether the control has focus, for a form that judges what is typed only when it is finished. */
  readonly onFocusChange?: (focused: boolean) => void;
}

/**
 * The template's one field — `.field-set` with its label, its `.field` and its
 * help line (`design/templates/state-tree.html`, lines 151-164).
 *
 * The label is shown, and it names the control through `for`, so clicking it
 * focuses the control. A wrong value is said inside the field: pass `faults`
 * and the strip appears under the words, the ring thickens to brick, and the
 * control points `aria-describedby` at the strip and nowhere else, so a screen
 * reader reads the faults as the field's description. With no fault the control
 * is described by its help line.
 *
 * Not built on MUI's field component: that draws an outline meant for paper
 * and a floating label this template has none of. What is kept is a native
 * `<input>`/`<textarea>`, which gives a native `disabled` attribute and every
 * built-in keyboard behaviour.
 *
 * @param props.label - Shown above the field and its accessible name
 * @param props.multiline - The multi-line kind
 * @param props.help - The line under the field
 * @param props.faults - Sentences saying what is wrong, shown inside the field
 *
 * @example
 * <Field label="Your nickname" value={nickname} onChange={setNickname} autoFocus />
 */
export const Field = ({
  label,
  value,
  onChange,
  multiline = false,
  disabled = false,
  placeholder,
  autoFocus = false,
  maxLength,
  id,
  help,
  faults = [],
  onFocusChange,
}: FieldProps) => {
  const generated = useId();
  const controlId = id ?? generated;
  const helpId = `${controlId}-help`;
  const faultId = `${controlId}-fault`;
  const invalid = faults.length > 0;
  const describedBy = invalid ? faultId : help === undefined ? undefined : helpId;

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange(event.target.value);
  const shared = {
    id: controlId,
    value,
    onChange: handleChange,
    disabled,
    placeholder,
    maxLength,
    'aria-invalid': invalid ? true : undefined,
    'aria-describedby': describedBy,
    onFocus: () => onFocusChange?.(true),
    onBlur: () => onFocusChange?.(false),
  };

  return (
    <Box sx={fieldSetSx}>
      <Box component="label" htmlFor={controlId} sx={fieldLabelSx}>
        {label}
      </Box>
      <Box component="span" sx={fieldSx({ invalid, disabled })}>
        {multiline ? (
          <Box component="textarea" rows={4} {...shared} />
        ) : (
          <Box component="input" type="text" autoFocus={autoFocus} {...shared} />
        )}
        {invalid && (
          <Box component="ul" id={faultId} className="field-fault" sx={fieldFaultSx}>
            {faults.map((fault) => (
              <li key={fault}>{fault}</li>
            ))}
          </Box>
        )}
      </Box>
      {help !== undefined && (
        <Box component="span" id={helpId} sx={fieldHelpSx}>
          {help}
        </Box>
      )}
    </Box>
  );
};

/**
 * The read-only kind — `.field.readonly` (template line 945) — that shows the
 * invite link: a one-line input that clips at every width.
 *
 * It no longer grows (the growing field of issue #199 is superseded by the
 * template). The control is a real `<input readOnly>`, so the link is
 * selectable and a browser that refuses the clipboard still leaves it to be
 * copied by hand (issue #101). It has no label on screen: the panel it stands
 * in names it, and the control carries the name.
 *
 * @param props.label - The accessible name — never shown as text
 * @param props.value - What is shown
 *
 * @example
 * <ReadOnlyField label="Room link" value={roomUrl(roomId, origin)} />
 */
export const ReadOnlyField = ({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) => (
  <Box component="span" sx={fieldSx({ invalid: false, disabled: false, readOnly: true })}>
    <Box component="input" type="text" value={value} readOnly aria-label={label} />
  </Box>
);
