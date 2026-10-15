import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

import { STREET } from '../street';
import { TILE_SX } from './surface-styles';

/** The four kinds of thing this app ever has to say. */
export type MessageKind = 'error' | 'warning' | 'info' | 'success';

/**
 * The rule down a message's left edge, by the role of its kind: an error is
 * brick, a warning the lit window (ochre), a success the action's spruce and
 * information the secondary slate.
 *
 * Ochre is a fill and never writing, so it appears here and in the mark and
 * nowhere in a message's text. What kind a message is, is said by the words of
 * its heading as well, and never by colour alone.
 */
const ACCENT: Record<MessageKind, string> = {
  error: STREET.brick,
  warning: STREET.ochre,
  info: STREET.slate,
  success: STREET.spruce,
};

/**
 * The head line's colour: ink for information, a warning and a success, and
 * brick for an error. Brick is writing on a tile or on the ground, and a
 * message is a tile.
 */
const HEAD: Record<MessageKind, string> = {
  error: STREET.brick,
  warning: STREET.ink,
  info: STREET.ink,
  success: STREET.ink,
};

interface MessageProps {
  /** Which of the four kinds this is — picks the rule, the mark and the head colour. */
  readonly kind: MessageKind;
  /** The short, uppercase line above the sentence. Always present. */
  readonly heading: string;
  /**
   * `id` put on the heading, for a caller whose own heading this message
   * stands in for and that already has an `aria-labelledby` pointing at one
   * (`GameCompletedPanel`, carried over from its `AlertTitle`).
   */
  readonly headingId?: string;
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
 * `.msg` in `design/templates/state-tree.html`, replacing MUI's `Alert`
 * everywhere in this app but `OwnPresenceNotice` (issue #185).
 *
 * A tile with the street's hairline round it, and a rule of its kind down the
 * left. It writes ink on a surface of its own, and nothing in it reads
 * `Typography` at a `body2` variant: the colour of each line is set on the line
 * itself, by the role it plays (a heading, a sentence, a detail). Every colour
 * is a token of the street (`street.ts`).
 *
 *  * No icon: the template carries none, the 8px mark and the head line already
 * say which kind this is, and a fourth statement of it would be the one MUI
 * drew that the template deliberately leaves out.
 *
 * @param props.kind - Which of the four kinds this is
 * @param props.heading - The short, uppercase line above the sentence
 * @param props.children - The sentence itself
 * @param props.items - Further detail as a list, if there is any
 * @param props.role - `alert` unless the caller is `GameCompletedPanel`
 *
 * @example
 * <Message kind="warning" heading="No crossword can be built">
 *   None of these words cross each other. Add or change a few words — words
 *   that share letters can cross.
 * </Message>
 */
export const Message = ({
  kind,
  heading,
  headingId,
  children,
  items,
  role = 'alert',
}: MessageProps) => (
  <Box
    role={role}
    sx={{
      display: 'flex',
      gap: '12px',
      width: '100%',
      padding: '12px 15px 13px',
      ...TILE_SX,
      // Outside the box, unlike every other tile: the rule down the left is
      // 3px of the box's own border, and an outline drawn inside would cover
      // half of it.
      outlineOffset: 0,
      borderLeft: `3px solid ${ACCENT[kind]}`,
      borderRadius: '2px',
    }}
  >
    <Box
      aria-hidden
      sx={{
        flex: 'none',
        width: '8px',
        height: '8px',
        marginTop: '6px',
        borderRadius: '50%',
        backgroundColor: ACCENT[kind],
      }}
    />

    <Box sx={{ minWidth: 0 }}>
      <Box
        component="span"
        id={headingId}
        sx={{
          display: 'block',
          fontSize: '9.5px',
          // The page's 1.6, which the template's `.msg .head` inherits and this
          // app's body does not (1.5): a heading of one line came out 0.95px
          // short of the drawing, and one that wraps in a narrow zone twice
          // that (issue #199, the presence notice in the lobby's zone).
          lineHeight: 1.6,
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: HEAD[kind],
          marginBottom: '3px',
        }}
      >
        {heading}
      </Box>

      <Box
        component="p"
        sx={{ margin: 0, fontSize: '12.5px', lineHeight: 1.55, color: STREET.ink }}
      >
        {children}
      </Box>

      {items !== undefined && items.length > 0 && (
        <Box component="ul" sx={{ margin: '7px 0 0', paddingLeft: '16px' }}>
          {items.map((item, index) => (
            <Box
              // Index joined in rather than the text alone: two dropped words
              // never repeat, but two validation errors about two different
              // words can read identically (`WordListForm`'s "is listed more
              // than once", said once per word it is true of).
              key={`${index}:${item}`}
              component="li"
              sx={{ fontSize: '12px', color: STREET.slate, margin: '2px 0' }}
            >
              {item}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  </Box>
);
