import type { CSSObject } from '@mui/material/styles';

import { inRem, TEXT_FONT_FAMILY } from '../scale';
import { STREET } from '../street';
import { FROM_WIDE } from './frame-styles';
import { OUTLINE_WIDTH } from './surface-styles';

/**
 * How the lobby is set, the way the template draws it
 * (`design/templates/state-tree.html`: `.h3` line 113, `.stack-tight` line 116,
 * `.players` lines 167-176, `.inline-status` lines 160-164 and `.lobby-grid`
 * lines 239-241).
 *
 * The numbers are the template's own and none is a step of `scale.ts`, the same
 * way the gate's are not (`gate-panel-styles.ts`). Lengths are in `rem`, so a
 * reader who has made their text larger gets a column that grows with it.
 */

/** `.h3`: the name of a block, 22px bold in a line of 1.3. The lobby's blocks and the game room's lists are named with it. */
export const lobbyHeadingSx: CSSObject = {
  margin: 0,
  fontFamily: TEXT_FONT_FAMILY,
  fontSize: inRem(22),
  fontWeight: 700,
  lineHeight: 1.3,
  color: STREET.ink,
};

/** `.stack-tight`: a block and what it is about, 10px apart. */
export const lobbyTightStackSx: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: inRem(10),
};

/** `.inline-status`: the line that answers a press, 16px. */
export const inlineStatusSx: CSSObject = { fontSize: inRem(16), lineHeight: 1.5 };

/** `.lobby-grid`'s column beside the drawing, 420px. */
export const LOBBY_COLUMN_WIDTH = inRem(420);

/** The gap between that column and the drawing, 56px. */
export const LOBBY_GRID_GAP = inRem(56);

/** The gap when the two stand one above the other, 28px. */
export const LOBBY_STACKED_GAP = inRem(28);

/** One row of the list of players: `.players li`, with its hairline above. */
export const playerRowSx: CSSObject = {
  display: 'flex',
  alignItems: 'baseline',
  gap: inRem(10),
  padding: `${inRem(10)} 0`,
  borderTop: `${OUTLINE_WIDTH}px solid ${STREET.line}`,
  '&:last-of-type': { borderBottom: `${OUTLINE_WIDTH}px solid ${STREET.line}` },
};

/**
 * The lobby drawing on a wide window: it grows to the height the window has and
 * no further, so the page never scrolls (`.device[data-layout="wide"]
 * .lobby-picture svg`, `design/templates/state-tree.html` line 244). The
 * drawing's own inline `width: 100%` is overridden, because `width: auto` is what
 * lets the cap on height set the width.
 */
export const lobbyPictureSx: CSSObject = {
  [FROM_WIDE]: {
    '& svg': {
      width: 'auto !important',
      maxWidth: '100%',
      maxHeight: 'calc(100dvh - var(--frame-header-height, 64px) - 136px)',
      margin: '0 auto',
    },
  },
};
