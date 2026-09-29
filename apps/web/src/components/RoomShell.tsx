import Box from '@mui/material/Box';
import { type SxProps, type Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { gapAt, inRem } from '../scale';
import { BAND_SX, ON_SCENE_SX, fullHeightBandSx, stepTitleSx } from '../garden/scene-surface';
import { APP_SHELL, SIDE_ZONE_WIDTH, THREE_ZONES } from './room-layout';
import { useShiftRole } from './screen-shift';

/** What the page is, said once for every phase the room goes through. */
const ROOM_HEADING = 'Game room';

/**
 * How much air a zone keeps between its own edge and what is written in it, as
 * a step of the row and as the length two `calc()`s need it in.
 *
 * It used to be the frame's own padding as well, and stopped being that when
 * the frame took the template's (issue #198): a zone's padding is its own
 * surface, which the lobby and the game room own.
 */
const ZONE_PADDING = gapAt(4);

/**
 * How far the frame stands from the edge of the window, in the template's own
 * pixels (`design/templates/state-tree.html`'s `.room`, lines 280 and 319 and
 * 335): 20 above and 24 below on a phone with 16 either side, 16 and 22 from the
 * app shell, 20 and 22 from the three zones. They are not steps of the spacing
 * row, the same way `gate-panel-styles.ts`'s panel padding is not. Lengths are
 * in `rem` so that a reader who has made their text larger gets a frame that
 * grows with it.
 */
const FRAME_PADDING = {
  document: `${inRem(20)} ${inRem(16)} ${inRem(24)}`,
  application: `${inRem(16)} ${inRem(22)}`,
  threeZones: `${inRem(20)} ${inRem(22)}`,
} as const;

/**
 * How wide the band behind a side zone is: the zone it holds, and the padding
 * either side of it. A band exists only where the room is three zones, so the
 * padding it is measured against is the three-zone frame's own: 22px, not the
 * 16 it was before the frame took the template's.
 */
const BAND_WIDTH = `calc(${SIDE_ZONE_WIDTH} + ${inRem(22)} + ${inRem(22)})`;

/**
 * A heading that is there to be read aloud and not to be looked at.
 *
 * The screen a game is played on carries no title, because the letters in the
 * squares say what it is and the strip a title would take is height the board
 * has none of (`docs/decisions/0029-a-board-that-fits-the-screen-it-is-played-on.md`).
 * A page with no heading at all is a different thing, though — somebody moving
 * through it by headings would find nothing — so the name is still said, and
 * takes no pixels to say it.
 *
 * Written out rather than taken from `visuallyHidden`: that lives in
 * `@mui/utils`, which this app does not depend on and would have to start
 * depending on for six properties of CSS.
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
  ...(isEmpty
    ? { display: 'none' }
    : {
        ...ON_SCENE_SX,
        // The band, as tall as what stands on it. Where the window is wide
        // enough to give the list a column of its own, the band is drawn behind
        // instead and runs the whole height of the window, so this one gets out
        // of its way rather than doubling its darkness.
        ...BAND_SX,
        padding: ZONE_PADDING,
      }),
  [APP_SHELL]: {
    display: 'block',
    gridArea: area,
    minHeight: 0,
    overflowY: 'auto',
  },
  // An empty zone is still a column while the room is an application — that is
  // what keeps the board in the middle when only one side has anything to say —
  // but it is an empty column and not a band with nothing on it.
  [THREE_ZONES]: isEmpty ? {} : { backgroundColor: 'transparent', padding: 0 },
});

/**
 * What the room's `main` is laid out as when one thing stands alone in it: a
 * grid of one column that centres its only child across, and down.
 *
 * `.zones.solo` in the template, and the layout of `join`, which stands in the
 * room's frame with nobody else in the room to put in the zones either side of
 * it (issue #198). On a phone the zone is as tall as its child and the page
 * scrolls, so it takes no share of the window's height (`flex: none`); from the
 * app shell up the frame is one window tall and the zone takes what the header
 * leaves, stretching its one row so that the child is centred in all of it and
 * not stood under the header. The three-zone `main` keeps `alignContent:
 * 'start'` and has no way to do that, which is why this is a layout of its own
 * and not a modifier of that one.
 */
const SOLO_SX = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  placeItems: 'center',
  alignContent: 'center',
  flex: 'none',
  [APP_SHELL]: { flex: 1, minHeight: 0, alignContent: 'stretch' },
} as const;

interface RoomShellBaseProps {
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
  /**
   * The middle of the screen, which is the board on every screen that has one.
   *
   * A screen may have none, and the lobby is that screen: it stands at the doors
   * of the temple, and the doorway is what fills the middle of the window — the
   * hall behind it is visible through that same opening in the picture (issue
   * #115; a camera used to travel through it when the game began, a mechanism
   * issue #152 removed without changing what stands in the middle). What that
   * screen puts there is nothing.
   *
   * On a `solo` screen it is the one thing that stands alone.
   */
  readonly children?: ReactNode;
}

/** A room with three zones: what this player gives, the board, and what they get back. */
interface RoomZonesProps extends RoomShellBaseProps {
  readonly solo?: false;
  /** What this player gives the other one — nothing until the words are dealt. */
  readonly left?: ReactNode;
  /** What they get back from them, and who is in the room. */
  readonly right?: ReactNode;
}

/**
 * A room with one thing in it and no zones: `join`, whose visitor is not in the
 * room yet, so there is nothing of the game to put either side of them. It is
 * the same frame all the same, so walking in moves the contents of a screen
 * rather than replacing one.
 */
interface RoomSoloProps extends RoomShellBaseProps {
  readonly solo: true;
  readonly left?: never;
  readonly right?: never;
}

type RoomShellProps = RoomZonesProps | RoomSoloProps;

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
 * @param props.children - The middle zone: the board, or nothing at all
 * @param props.solo - Whether one thing stands alone in the middle of the frame, with no zones; `join` alone
 *
 * @example
 * <RoomShell status={<Status />} left={<ToExplain />} right={<ToGuess />}>
 *   <RoomCrossword room={room} viewerId={viewerId} caption={caption} />
 * </RoomShell>
 */
export const RoomShell = ({
  title,
  status,
  action,
  left,
  right,
  children,
  solo = false,
}: RoomShellProps) => {
  const isLeaving = useShiftRole() === 'leaving';

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: inRem(16),
        padding: FRAME_PADDING.document,
        // At least a window tall on a phone, on every screen: the frame is one
        // drawing, and what stands in it is centred in the height it has (issue
        // #198). It is a floor and not a cap, so a screen taller than the window
        // still scrolls. From the app shell up `height` fixes it to one window,
        // which a `min-height` set beside it cannot narrow.
        minHeight: '100dvh',
        [APP_SHELL]: {
          height: '100dvh',
          minHeight: 0,
          gap: inRem(14),
          padding: FRAME_PADDING.application,
          overflow: 'hidden',
        },
        [THREE_ZONES]: { padding: FRAME_PADDING.threeZones },
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
          columnGap: 4,
          rowGap: 2,
          visibility: isLeaving ? 'hidden' : undefined,
          ...ON_SCENE_SX,
          [APP_SHELL]: { flexShrink: 0 },
        }}
      >
        {title === undefined ? (
          <Typography component="h1" variant="h1" sx={UNSEEN_HEADING}>
            {ROOM_HEADING}
          </Typography>
        ) : (
          // A row of its own, so that what the room is doing wraps beside or
          // under it rather than into it, and the rule under it runs the whole
          // width of that row: the template's `.step-title` is `flex-basis:
          // 100%` with a rule as wide as its own block (`stepTitleSx`).
          <Box sx={{ flexBasis: '100%' }}>
            <Typography component="h1" variant="signage" sx={stepTitleSx()}>
              {title}
            </Typography>
          </Box>
        )}

        {/* Wide enough to sit beside the heading on a screen that has the room
          for it, and told to take a line of its own rather than be squeezed
          into a column of single words when it does not. */}
        <Box sx={{ flex: '1 1 16rem', minWidth: 0 }}>{status}</Box>

        {/* Pushed to the far end of the header where there is a header to push it
          along, and left where it falls in a document, which is a page a player
          reads from the top down rather than a bar they scan across. */}
        {action !== undefined && <Box sx={{ [APP_SHELL]: { ml: 'auto' } }}>{action}</Box>}
      </Box>

      {solo ? (
        <Box component="main" sx={SOLO_SX}>
          {children}
        </Box>
      ) : (
        <Box
          component="main"
          sx={{
            display: 'grid',
            gap: 5,
            alignContent: 'start',
            [APP_SHELL]: {
              flex: 1,
              minHeight: 0,
              gap: 4,
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
      )}
    </Box>
  );
};
