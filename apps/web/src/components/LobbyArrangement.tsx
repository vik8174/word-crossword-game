import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { inRem } from '../scale';
import { FROM_TABLET, FROM_WIDE } from './frame-styles';
import { LOBBY_COLUMN_WIDTH, LOBBY_GRID_GAP, LOBBY_STACKED_GAP } from './lobby-styles';
import { UNSEEN_HEADING } from './surface-styles';

interface LobbyArrangementProps {
  /** The page's name, read aloud and not shown. */
  readonly title: string;
  /** The column of the screen: notice, players, invite or action. */
  readonly column: ReactNode;
  /** The drawing and the line under it. */
  readonly picture: ReactNode;
}

/**
 * The lobby's own arrangement in `RoomShell`: `.lobby-grid` and the `.body` it
 * stands in (`design/templates/state-tree.html`, lines 218-224 and 239-241).
 *
 * From 1200 wide, a 420px column beside the drawing, 56px apart. Under it, one
 * column with the drawing first and 28px between. The column stays first in the
 * document, so a reader meets the people and the actions before the drawing,
 * and the drawing is moved up by `order` where the two stand one above the other.
 *
 * The status line is not here: it is the frame's (`useFrameSlot`), and the
 * visible "Lobby" is gone. The page keeps its `h1`, unseen, so its structure
 * does not change for a screen reader.
 *
 * @param props.title - The unseen `h1`
 * @param props.column - The column of the screen
 * @param props.picture - The drawing
 */
export const LobbyArrangement = ({ title, column, picture }: LobbyArrangementProps) => (
  <Box
    sx={{
      padding: `${inRem(24)} ${inRem(18)} ${inRem(40)}`,
      [FROM_TABLET]: { paddingInline: inRem(32) },
      [FROM_WIDE]: { paddingInline: inRem(48) },
    }}
  >
    <Typography component="h1" variant="h1" sx={UNSEEN_HEADING}>
      {title}
    </Typography>

    <Box
      component="main"
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        gap: LOBBY_STACKED_GAP,
        alignItems: 'start',
        [FROM_WIDE]: {
          gridTemplateColumns: `${LOBBY_COLUMN_WIDTH} minmax(0, 1fr)`,
          gap: LOBBY_GRID_GAP,
        },
      }}
    >
      <Box sx={{ minWidth: 0 }}>{column}</Box>
      <Box
        sx={{
          minWidth: 0,
          order: -1,
          [FROM_WIDE]: { order: 0 },
        }}
      >
        {picture}
      </Box>
    </Box>
  </Box>
);
