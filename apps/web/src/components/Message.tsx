import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

import { inRem, TEXT_FONT_FAMILY } from '../scale';
import { STREET } from '../street';

/** The four kinds of thing this app ever has to say. */
export type MessageKind = 'error' | 'warning' | 'info' | 'success';

/**
 * What each kind puts in its mark (`.msg .mark::before`, template lines
 * 139-146): the glyph, the mark's fill, and the glyph's colour.
 *
 * What kind a message is, is written by its glyph and its heading as well, and
 * never by colour alone. Ochre is a fill and never writing, so it appears in
 * the mark and nowhere in a message's text.
 */
const MARK: Record<MessageKind, { glyph: string; fill: string; ink: string; italic?: boolean }> = {
  error: { glyph: '×', fill: STREET.rose, ink: STREET.ink },
  warning: { glyph: '!', fill: STREET.ochre, ink: STREET.ink },
  success: { glyph: '✓', fill: STREET.spruce, ink: STREET.onAccent },
  info: { glyph: 'i', fill: STREET.tile, ink: STREET.ink, italic: true },
};

/** The head line's colour: ink, and brick for an error (`.msg.error .head`). */
const HEAD: Record<MessageKind, string> = {
  error: STREET.brick,
  warning: STREET.ink,
  info: STREET.ink,
  success: STREET.ink,
};

interface MessageProps {
  /** Which of the four kinds this is — picks the mark and the head colour. */
  readonly kind: MessageKind;
  /** The short line above the sentence. Always present. */
  readonly heading: string;
  /**
   * `id` put on the heading, for a caller whose own heading this message
   * stands in for and that already has an `aria-labelledby` pointing at one
   * (`GameCompletedPanel`, carried over from its `AlertTitle`).
   */
  readonly headingId?: string;
  /**
   * Makes the heading the page's own, at this level, for the one screen whose
   * only heading it is (the not-found page). Drawn the same either way; a
   * `span` unless given.
   */
  readonly headingLevel?: 'h1' | 'h2';
  /** The sentence the message says. */
  readonly children: ReactNode;
  /** Further detail as a list, e.g. the words a list problem names or drops. */
  readonly items?: readonly string[];
  /**
   * How this message announces itself to a screen reader.
   *
   * `alert` everywhere except `GameCompletedPanel`, which keeps the `status`
   * its `Alert` carried — a decision this component only carries out, not one
   * it makes (issue #185, "Decided, not to reopen").
   */
  readonly role?: 'alert' | 'status';
}

/**
 * The template's one component for every error, warning, notice and success —
 * `.msg` in `design/templates/state-tree.html` (lines 135-148), replacing MUI's
 * `Alert` everywhere in this app but `OwnPresenceNotice` (issue #185), and
 * redrawn to design v2 for every screen that renders one (issue #225).
 *
 * A tile with an ink ring and 12px corners, a 26px mark that says the kind by
 * its glyph (`×`, `!`, `✓`, `i`), a 19px bold head line and a 17px sentence.
 * The head line is brick for an error and ink for the rest. A wrong word list
 * is not a message: that is said inside the field (`Field`'s `faults`).
 *
 * @param props.kind - Which of the four kinds this is
 * @param props.heading - The short line above the sentence
 * @param props.headingLevel - Makes the heading an `h1` or `h2`; a `span` otherwise
 * @param props.children - The sentence itself
 * @param props.items - Further detail as a list, if there is any
 * @param props.role - `alert` unless the caller is `GameCompletedPanel`
 *
 * @example
 * <Message kind="error" heading="The room could not be created">
 *   Check your connection and try again.
 * </Message>
 */
export const Message = ({
  kind,
  heading,
  headingId,
  headingLevel,
  children,
  items,
  role = 'alert',
}: MessageProps) => {
  const mark = MARK[kind];

  return (
    <Box
      role={role}
      sx={{
        display: 'flex',
        gap: inRem(14),
        width: '100%',
        padding: `${inRem(16)} ${inRem(18)}`,
        backgroundColor: STREET.tile,
        borderRadius: inRem(12),
        boxShadow: `0 0 0 1.5px ${STREET.ink}`,
      }}
    >
      <Box
        aria-hidden
        sx={{
          flex: 'none',
          width: inRem(26),
          height: inRem(26),
          borderRadius: inRem(6),
          display: 'grid',
          placeItems: 'center',
          fontWeight: 700,
          fontSize: inRem(16),
          lineHeight: 1,
          fontStyle: mark.italic === true ? 'italic' : 'normal',
          boxShadow: `inset 0 0 0 1.5px ${STREET.ink}`,
          backgroundColor: mark.fill,
          color: mark.ink,
        }}
      >
        {mark.glyph}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          component={headingLevel ?? 'span'}
          id={headingId}
          sx={{
            display: 'block',
            fontFamily: TEXT_FONT_FAMILY,
            margin: `0 0 ${inRem(2)}`,
            fontWeight: 700,
            fontSize: inRem(19),
            lineHeight: 'inherit',
            color: HEAD[kind],
          }}
        >
          {heading}
        </Box>

        <Box component="p" sx={{ margin: 0, fontSize: inRem(17), color: STREET.ink }}>
          {children}
        </Box>

        {items !== undefined && items.length > 0 && (
          <Box
            component="ul"
            sx={{ margin: `${inRem(6)} 0 0`, paddingLeft: inRem(20), fontSize: inRem(17) }}
          >
            {items.map((item, index) => (
              // Index joined in rather than the text alone: two entries about
              // two different words can read identically.
              <li key={`${index}:${item}`}>{item}</li>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};
