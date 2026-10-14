import Box from '@mui/material/Box';
import { type SxProps, type Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { inRem } from '../scale';
import { BAND_EDGE, BAND_EDGE_WIDTH } from '../garden/scene-palette';
import { BAND_SX, ON_SCENE_SX, stepTitleSx } from '../garden/scene-surface';
import { APP_SHELL, SIDE_ZONE_WIDTH, THREE_ZONES, ZONES_GAP } from './room-layout';
import { useShiftRole } from './screen-shift';
import { ZONE_PADDING } from './zone-styles';

/** What the page is, said once for every phase the room goes through. */
const ROOM_HEADING = 'Game room';

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
 * The size of the room's status line, in the template's own pixels
 * (`.room-status`, `design/templates/state-tree.html` line 296): 12.5, with its
 * line 1.5 and a shadow that lets it be read off a lit roof as well as off a
 * shadow.
 *
 * Twelve and a half is not one of the four levels `context.md`'s **Level**
 * entry closes (31, 23, 17, 13). The status line is granted the exception here,
 * explicitly and for this one slot (issue #199): the drawing sets it at 12.5 on
 * every room screen that has a status line, and two do, the lobby and
 * `playing`. It is not a fifth level, and `scale.ts` has none added. It is set
 * on the slot rather than on the sentence in it, so the two screens that fill
 * it move together and a third that does never has to remember to.
 */
const STATUS_SX = {
  textShadow: '0 1px 7px rgba(6, 12, 10, 0.92)',
  '& .MuiTypography-root': { fontSize: inRem(12.5), lineHeight: 1.5 },
} as const;

/**
 * The surface a zone is: the band, blurred a little, with the temple's red run
 * along its top edge. `.zone` in the template (line 306), and the whole of what
 * a zone looks like. There is no box drawn behind it and running to the edge of
 * the window, so nothing stacks over it and the zone stops where the frame does.
 */
const ZONE_SURFACE = {
  ...BAND_SX,
  backdropFilter: 'blur(2px)',
  WebkitBackdropFilter: 'blur(2px)',
  borderTop: `${BAND_EDGE_WIDTH}px solid ${BAND_EDGE}`,
} as const;

/** A zone with the surface switched off: what a side with nothing on it is from a tablet up. */
const NO_ZONE_SURFACE = {
  backgroundColor: 'transparent',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  borderTop: 0,
} as const;

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
 * A zone with anything in it is a surface of its own ({@link ZONE_SURFACE}),
 * at every width, and everything inside it is written in the forest's cream.
 *
 * An empty zone is a column with nothing in it while the room is an
 * application — that is what keeps the board in the middle of the screen when
 * only one side has anything to say. In a document it is nothing at all, since
 * a stack would otherwise put a gap where a lobby has no words yet. What an
 * empty column looks like changes with the window, on purpose and as drawn: bare
 * picture on a tablet, where the two zones share a row and an empty one is a
 * hole in it, and the surface it was drawn with from three zones up
 * (`state-tree.html` lines 329 and 342), where it is one of the columns either
 * side of the doorway and the frame would look lopsided without it.
 *
 * @param area - Which of the named areas of the shell's grid it fills
 * @param isEmpty - Whether this screen handed the zone anything
 */
const zoneSx = (area: string, isEmpty: boolean): SxProps<Theme> => ({
  ...(isEmpty ? { display: 'none' } : { ...ON_SCENE_SX, ...ZONE_SURFACE, padding: ZONE_PADDING }),
  [APP_SHELL]: {
    display: 'block',
    gridArea: area,
    minHeight: 0,
    overflowY: 'auto',
    ...(isEmpty ? NO_ZONE_SURFACE : {}),
  },
  [THREE_ZONES]: isEmpty ? ZONE_SURFACE : {},
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
 * with anything in it is a surface of its own, the shadow under the canopy with
 * the temple's red along its top edge, and it stops where the frame does
 * rather than running out to the edge of the window (issue #199; it was a
 * separate box behind the zone, with the red down its inner side). And
 * everything inside a zone or the header is written in the forest's own cream
 * instead of in ink meant for paper (see `scene-surface.ts`).
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
        <Box sx={{ flex: '1 1 16rem', minWidth: 0, ...STATUS_SX }}>{status}</Box>

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
              // The zones' own 14px and not a step of the spacing row, which has
              // none between 12 and 16 (`ZONES_GAP`, issue #199). From a tablet up
              // because the template's `.zones` says 14 from 768.
              gap: ZONES_GAP,
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

          {/* Nothing in a document when a screen puts nothing there, as the
            template's `.zone-middle.empty` is: the lobby's middle is the
            doorway, and a grid gap left standing beside an empty box would be
            24px of page under the zone. From a tablet up it is still the row
            the board would stand in. */}
          <Box
            sx={{
              ...(children === undefined && { display: 'none' }),
              [APP_SHELL]: {
                display: 'block',
                gridArea: 'board',
                minHeight: 0,
                overflowY: 'auto',
              },
            }}
          >
            {children}
          </Box>

          <Box sx={zoneSx('right', right === undefined)}>{right}</Box>
        </Box>
      )}
    </Box>
  );
};
