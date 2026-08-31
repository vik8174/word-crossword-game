import Box from '@mui/material/Box';
import { type SxProps, type Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { BAND_EDGE, BAND_EDGE_WIDTH } from '../garden/scene-palette';
import { BAND_SX, fullHeightBandSx, ON_SCENE_SX, stepTitleSx } from '../garden/scene-surface';
import { APP_SHELL, SIDE_ZONE_WIDTH, THREE_ZONES } from './room-layout';
import { useShiftRole } from './screen-shift';

/** What the page is, said once for every phase the room goes through. */
const ROOM_HEADING = 'Game room';

/** How much air the frame keeps between itself and the edge of the window. */
const FRAME_PADDING = '16px';

/** How wide a band is: the zone it holds, and the frame's padding either side of it. */
const BAND_WIDTH = `calc(${SIDE_ZONE_WIDTH} + ${FRAME_PADDING} + ${FRAME_PADDING})`;

/**
 * A heading that is there to be read aloud and not to be looked at.
 *
 * The screen a game is played on carries no title, because the letters in the
 * squares say what it is and the strip a title would take is height the board
 * has none of (`docs/decisions/0029-a-board-that-fits-the-screen-it-is-played-on.md`).
 * A page with no heading at all is a different thing, though — somebody moving
 * through it by headings would find nothing — so the name is still said, and
 * takes no pixels to say it.
 */
const UNSEEN_HEADING = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;

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
  ...ON_SCENE_SX,
  // The band, as tall as what stands on it. Where the window is wide enough to
  // give the list a column of its own, the band is drawn behind instead and
  // runs the whole height of the window, so this one gets out of its way rather
  // than doubling its darkness.
  ...BAND_SX,
  padding: FRAME_PADDING,
  [APP_SHELL]: {
    display: 'block',
    gridArea: area,
    minHeight: 0,
    overflowY: 'auto',
  },
  [THREE_ZONES]: { backgroundColor: 'transparent', padding: 0 },
});

/**
 * The middle of the screen when there is no board to put there: a sentence, or
 * a form, at a width somebody can read.
 *
 * The board is given the whole middle zone because it uses every pixel of it. A
 * paragraph stretched the same way is a paragraph nobody finishes a line of, so
 * anything that is words rather than squares is capped and centred instead.
 *
 * It stands on the same band a list of words does, and for the same reason: a
 * form is text, and text has to be read off a forest. Where a zone has a column
 * the band is that column; here there is no column, so the band is a block of
 * the same material with the same red line along the edge it meets the picture
 * at.
 *
 * @param props.children - What this screen has to say or ask
 *
 * @example
 * <RoomShell><RoomMiddleColumn><JoinRoomForm ... /></RoomMiddleColumn></RoomShell>
 */
export const RoomMiddleColumn = ({ children }: { readonly children: ReactNode }) => (
  <Box
    sx={{
      maxWidth: '32rem',
      mx: 'auto',
      p: 3,
      ...BAND_SX,
      ...ON_SCENE_SX,
      borderTop: `${BAND_EDGE_WIDTH}px solid ${BAND_EDGE}`,
    }}
  >
    {children}
  </Box>
);

interface RoomShellProps {
  /**
   * The name of this step of the room, shown top left with the temple's red
   * run under it.
   *
   * A screen that gives none is named to a reader and to nobody else, which is
   * the game's own case: the letters in the squares say what that screen is,
   * and the strip a title would take is height the board has none of.
   */
  readonly title?: string;
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
 * The frame standing still is also what the shift between screens is drawn
 * against (issue #93). While one is running there are two of these on the page,
 * so the one on its way out gives up its header and lets the arriving screen's
 * stand in the same place: the header is the part that does not move, and two
 * of them printed over each other would be the page redrawing after all.
 *
 * The interface stands on the picture the whole app is drawn in front of, so
 * two things about it are settled here rather than screen by screen. A zone
 * with anything in it stands on a band — a column of the shadow under the
 * canopy, run out to the edge of the window wherever the zone has a column of
 * its own — and everything inside a zone or the header is written in the
 * forest's own cream instead of in ink meant for paper (see `scene-surface.ts`).
 *
 * @param props.title - The name of this step, or nothing on the screen a game is played on
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
export const RoomShell = ({ title, status, action, left, right, children }: RoomShellProps) => {
  const isLeaving = useShiftRole() === 'leaving';

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        px: 2,
        py: 3,
        [APP_SHELL]: { height: '100dvh', gap: 2, py: 2, overflow: 'hidden' },
      }}
    >
      {/* The bands, where the window is wide enough for a zone to be a column.
        They are behind the zones rather than around them, so what a reader
        moves through is a list of words and not a decoration first. */}
      {(
        [
          ['left', left],
          ['right', right],
        ] as const
      ).map(([side, zone]) =>
        zone === undefined ? null : (
          <Box
            key={side}
            aria-hidden
            sx={{ display: 'none', [THREE_ZONES]: fullHeightBandSx(side, BAND_WIDTH) }}
          />
        ),
      )}

      <Box
        component="header"
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          columnGap: 2,
          rowGap: 1,
          visibility: isLeaving ? 'hidden' : undefined,
          ...ON_SCENE_SX,
          [APP_SHELL]: { flexShrink: 0 },
        }}
      >
        <Typography
          component="h1"
          sx={title === undefined ? UNSEEN_HEADING : stepTitleSx(`-${FRAME_PADDING}`)}
        >
          {title ?? ROOM_HEADING}
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
};
