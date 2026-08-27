import Box from '@mui/material/Box';
import { type SxProps, type Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { APP_SHELL, SIDE_ZONE_WIDTH, THREE_ZONES } from './room-layout';

/** What the page is, said once for every phase the room goes through. */
const ROOM_HEADING = 'Game room';

/**
 * The zone a side of the room is given, and what it does when it is empty.
 *
 * An empty zone is a column with nothing in it while the room is an
 * application — that is what keeps the board in the middle of the screen when
 * only one side has anything to say. In a document it is nothing at all, since
 * a stack would otherwise put a gap where a lobby has no words yet.
 *
 * @param area - Which of the named areas of the shell's grid it fills
 * @param isEmpty - Whether this screen handed the zone anything
 */
const zoneSx = (area: string, isEmpty: boolean): SxProps<Theme> => ({
  ...(isEmpty && { display: 'none' }),
  [APP_SHELL]: {
    display: 'block',
    gridArea: area,
    minHeight: 0,
    overflowY: 'auto',
  },
});

/**
 * The middle of the screen when there is no board to put there: a sentence, or
 * a form, at a width somebody can read.
 *
 * The board is given the whole middle zone because it uses every pixel of it. A
 * paragraph stretched the same way is a paragraph nobody finishes a line of, so
 * anything that is words rather than squares is capped and centred instead.
 *
 * @param props.children - What this screen has to say or ask
 *
 * @example
 * <RoomShell><RoomMiddleColumn><JoinRoomForm ... /></RoomMiddleColumn></RoomShell>
 */
export const RoomMiddleColumn = ({ children }: { readonly children: ReactNode }) => (
  <Box sx={{ maxWidth: '32rem', mx: 'auto' }}>{children}</Box>
);

interface RoomShellProps {
  /** What the room is doing right now, said in the header beside its name. */
  readonly status?: ReactNode;
  /** The one thing this screen offers to do, if it offers anything. */
  readonly action?: ReactNode;
  /** What this player gives the other one — nothing until the words are dealt. */
  readonly left?: ReactNode;
  /** What they get back from them, and who is in the room. */
  readonly right?: ReactNode;
  /** The middle of the screen, which every phase of a room fills with the board. */
  readonly children: ReactNode;
}

/**
 * The frame every screen of a room is drawn in: a header, and three zones with
 * the board in the middle.
 *
 * It is one component used by all five screens rather than five arrangements
 * that resemble each other, because the frame is meant to stand still while the
 * room moves through its phases. A lobby and a game differ in what the zones
 * hold and in nothing else, so going from one to the other is the contents
 * changing rather than the page being rebuilt.
 *
 * The zones say what the game is. What this player explains to the other one is
 * on the left, what they are being explained is on the right, and the board they
 * meet on is between them.
 *
 * Which of three layouts a window gets is decided in CSS and nowhere else (see
 * `room-layout.ts`), so the same elements are on the page whatever the screen:
 *
 * - a phone gets a document — one column, and the page scrolls
 * - a tablet gets the application, with the board across the top and the two
 *   indexes side by side underneath, because at that width a board with a column
 *   either side of it is narrower than the one the room has today
 * - a wide screen gets the three zones proper
 *
 * The height is fixed from a tablet up and nothing but a zone scrolls. That is
 * the whole point of the frame: every block above the board and below it was
 * taking the size of a square away from it, and a board that has to be scrolled
 * to is a board a player is not looking at.
 *
 * @param props.status - The room's own line about what it is doing
 * @param props.action - The screen's one control, offered in the header
 * @param props.left - The zone on the board's left; an empty one is left empty
 * @param props.right - The zone on its right
 * @param props.children - The middle zone, which is the board
 *
 * @example
 * <RoomShell status={<Status />} left={<ToExplain />} right={<ToGuess />}>
 *   <RoomCrossword room={room} viewerId={viewerId} caption={caption} />
 * </RoomShell>
 */
export const RoomShell = ({ status, action, left, right, children }: RoomShellProps) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      px: 2,
      py: 3,
      [APP_SHELL]: { height: '100dvh', gap: 2, py: 2, overflow: 'hidden' },
    }}
  >
    <Box
      component="header"
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        columnGap: 2,
        rowGap: 1,
        [APP_SHELL]: { flexShrink: 0 },
      }}
    >
      <Typography variant="h5" component="h1">
        {ROOM_HEADING}
      </Typography>

      {/* Wide enough to sit beside the heading on a screen that has the room
          for it, and told to take a line of its own rather than be squeezed
          into a column of single words when it does not. */}
      <Box sx={{ flex: '1 1 16rem', minWidth: 0 }}>{status}</Box>

      {/* Pushed to the far end of the header where there is a header to push it
          along, and left where it falls in a document, which is a page a player
          reads from the top down rather than a bar they scan across. */}
      {action !== undefined && <Box sx={{ [APP_SHELL]: { ml: 'auto' } }}>{action}</Box>}
    </Box>

    <Box
      component="main"
      sx={{
        display: 'grid',
        gap: 3,
        alignContent: 'start',
        [APP_SHELL]: {
          flex: 1,
          minHeight: 0,
          gap: 2,
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: 'auto minmax(0, 1fr)',
          gridTemplateAreas: '"board board" "left right"',
        },
        [THREE_ZONES]: {
          gridTemplateColumns: `${SIDE_ZONE_WIDTH} minmax(0, 1fr) ${SIDE_ZONE_WIDTH}`,
          gridTemplateRows: 'minmax(0, 1fr)',
          gridTemplateAreas: '"left board right"',
        },
      }}
    >
      <Box sx={zoneSx('left', left === undefined)}>{left}</Box>

      <Box sx={{ [APP_SHELL]: { gridArea: 'board', minHeight: 0, overflowY: 'auto' } }}>
        {children}
      </Box>

      <Box sx={zoneSx('right', right === undefined)}>{right}</Box>
    </Box>
  </Box>
);
