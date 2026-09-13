import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

import { BAND_SOLID, SCENE, SCENE_INK_DIM } from '../garden/scene-palette';

/** The four kinds of thing this app ever has to say. */
export type MessageKind = 'error' | 'warning' | 'info' | 'success';

/**
 * The four severities, in the three colours each is drawn in.
 *
 * Read straight off the template (`design/templates/state-tree.html`'s
 * `--sev-*` custom properties and the `.msg.<kind>` overrides beside them,
 * lines 20-23 and 456-462) rather than off the theme: these are the template's
 * own palette, distinct from `theme.ts`'s `error`/`warning`/`info`/`success`,
 * which still colour buttons and fields and stay exactly as they are. `info`
 * takes no override in the template because it is the base `.msg` rule itself
 * — a call to the template's `msg()` with `""` as the kind.
 */
const ACCENT: Record<MessageKind, string> = {
  error: '#DA4620',
  warning: '#C9A227',
  info: '#63D8CE',
  success: '#A9D147',
};

/** The 8×8 dot beside the text. Error alone reads lighter than its own rule colour. */
const MARK: Record<MessageKind, string> = {
  error: '#FF9068',
  warning: '#C9A227',
  info: '#63D8CE',
  success: '#A9D147',
};

/** The head line. Error and warning both read lighter than their own rule colour. */
const HEAD: Record<MessageKind, string> = {
  error: '#FF9068',
  warning: '#E0BC46',
  info: '#63D8CE',
  success: '#A9D147',
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
 * A dark surface rather than `Alert`'s pale paper, so it draws cream on a
 * surface of its own instead of ink meant for the theme's paper — which is
 * also why nothing in it reads `Typography` at a `body2` variant: that class
 * is dimmed wherever `garden/scene-surface.ts`'s `ON_SCENE_SX` stands over it
 * (`'& .MuiTypography-body2'`), which is the specificity bug this component
 * must not reintroduce by another name. Every colour below is written out
 * rather than read from the theme, because the template's severities are not
 * the theme's `error`/`warning`/`info`/`success` — those still belong to
 * buttons and fields and are untouched by this issue.
 *
 * No icon: the template carries none, the 8px mark and the head line already
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
      backgroundColor: BAND_SOLID,
      borderLeft: `3px solid ${ACCENT[kind]}`,
      borderRadius: '2px',
      backdropFilter: 'blur(2px)',
      WebkitBackdropFilter: 'blur(2px)',
      boxShadow: '0 12px 30px -18px rgba(0, 0, 0, 0.8)',
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
        backgroundColor: MARK[kind],
      }}
    />

    <Box sx={{ minWidth: 0 }}>
      <Box
        component="span"
        id={headingId}
        sx={{
          display: 'block',
          fontSize: '9.5px',
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
        sx={{ margin: 0, fontSize: '12.5px', lineHeight: 1.55, color: SCENE.cream }}
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
              sx={{ fontSize: '12px', color: SCENE_INK_DIM, margin: '2px 0' }}
            >
              {item}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  </Box>
);
