import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { inRem } from '../scale';
import { belowFrame } from './frame-height';
import { FROM_TABLET, FROM_WIDE } from './frame-styles';
import { LobbyArrangement } from './LobbyArrangement';
import { APP_SHELL, SIDE_ZONE_WIDTH, THREE_ZONES, ZONES_GAP } from './room-layout';
import { UNSEEN_HEADING } from './surface-styles';

/** What the page is, said once for every phase the room goes through. */
const ROOM_HEADING = 'Game room';

/**
 * How far the room's content stands from the edge of the window and from the
 * frame's header, in the template's own pixels (`.body` and `--pad`,
 * `design/templates/state-tree.html` lines 218-223): 24 above and 40 below at
 * every width, and 18, 32 and 48 either side on a phone, a tablet and a wide
 * window. They are not steps of the spacing row, the same way
 * `gate-panel-styles.ts`'s are not. Lengths are in `rem` so that a reader who
 * has made their text larger gets a frame that grows with it.
 */
const BODY_PADDING = `${inRem(24)} ${inRem(18)} ${inRem(40)}`;

/**
 * The zone a side of the room is, and what it does when it is empty.
 *
 * A zone is a column on the ground and nothing more: the drawing sets no
 * surface behind it (`.zone` has no rule of its own in `state-tree.html`; only
 * `.zones`, line 227, lays the three out). Everything in it is written in ink
 * on the page.
 *
 * An empty zone is a column with nothing in it while the room is an
 * application, which is what keeps the board in the middle of the screen when
 * only one side has anything to say, and nothing at all in a document, where a
 * stack would otherwise put a gap where there is nothing (`.zone.empty`, lines
 * 237-238).
 *
 * On a phone the board comes first, then the zone on the right ("You guess"),
 * then the one on the left ("You explain"): `order` moves them and the document
 * keeps its own order, left, board, right, which is the order a reader of the
 * markup is walked through.
 *
 * @param area - Which of the named areas of the shell's grid it fills
 * @param isEmpty - Whether this screen handed the zone anything
 * @param phoneOrder - Where it stands on a phone, after the board's -1
 */
const zoneSx = (area: string, isEmpty: boolean, phoneOrder: number) => ({
  order: phoneOrder,
  minWidth: 0,
  ...(isEmpty ? { display: 'none' } : {}),
  [APP_SHELL]: {
    order: 0,
    display: isEmpty ? 'block' : 'flex',
    flexDirection: 'column',
    gap: inRem(18),
    gridArea: area,
    minHeight: 0,
    overflowY: 'auto',
  },
});

interface RoomShellBaseProps {
  /**
   * The name of this step of the room, read aloud and not shown: the frame's
   * header carries the app's name, and a screen's status and its one action go
   * there through `useFrameSlot`.
   *
   * A screen that gives none is named "Game room", which is the game's own
   * case: the letters in the squares say what that screen is.
   */
  readonly title?: string;
  /**
   * The middle of the screen, which is the board on every screen that has one.
   *
   * A screen may have none, and the lobby is that screen: what it puts in the
   * middle is nothing.
   */
  readonly children?: ReactNode;
}

/** A room with three zones: what this player gives, the board, and what they get back. */
interface RoomZonesProps extends RoomShellBaseProps {
  /** What this player gives the other one — nothing until the words are dealt. */
  readonly left?: ReactNode;
  /** What they get back from them, and who is in the room. */
  readonly right?: ReactNode;
  /**
   * The lobby's drawing. Giving one selects the lobby's own arrangement
   * (`LobbyArrangement`, the template's `.lobby-grid`): `left` is then the
   * column beside it, and `right` and the children are not used.
   */
  readonly picture?: ReactNode;
}

type RoomShellProps = RoomZonesProps;

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
 * The frame's header is not this component's: a screen's status and its one
 * action are put there by `useFrameSlot`, and the frame draws the header once
 * for every screen, so nothing here moves when the room goes from one phase to
 * the next.
 *
 * A zone is a column on the ground, 290px wide from 1200 up with 40px between
 * the three of them (`.zones`, `design/templates/state-tree.html` line 227),
 * and it stops where the frame does rather than running out to the edge of the
 * window. Everything inside a zone is written in ink on the ground (see
 * `surface-styles.ts`).
 *
 * @param props.title - The name of this step, read aloud and not shown
 * @param props.left - The zone on the board's left; an empty one is left empty
 * @param props.right - The zone on its right
 * @param props.picture - The lobby's drawing; selects the lobby's arrangement
 * @param props.children - The middle zone: the board, or nothing at all
 *
 * @example
 * <RoomShell left={<ToExplain />} right={<ToGuess />}>
 *   <RoomCrossword room={room} viewerId={viewerId} caption={caption} />
 * </RoomShell>
 */
export const RoomShell = ({ title, left, right, picture, children }: RoomShellProps) => {
  if (picture !== undefined) {
    return <LobbyArrangement title={title ?? ROOM_HEADING} column={left} picture={picture} />;
  }

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        padding: BODY_PADDING,
        [FROM_TABLET]: { paddingInline: inRem(32) },
        [FROM_WIDE]: { paddingInline: inRem(48) },
        // At least what the frame's header leaves of a window on a phone, on
        // every screen: the frame is one drawing (issue #198). It is a floor
        // and not a cap, so a screen taller than that still scrolls. From the
        // app shell up `height` fixes it to what the header leaves, which a
        // `min-height` set beside it cannot narrow (issue #245).
        minHeight: belowFrame('100dvh'),
        [APP_SHELL]: { height: belowFrame('100dvh'), minHeight: 0, overflow: 'hidden' },
      }}
    >
      <Typography component="h1" variant="h1" sx={UNSEEN_HEADING}>
        {title ?? ROOM_HEADING}
      </Typography>

      <Box
        component="main"
        sx={{
          display: 'grid',
          gap: inRem(28),
          alignContent: 'start',
          [APP_SHELL]: {
            flex: 1,
            minHeight: 0,
            gap: inRem(28),
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: 'auto minmax(0, 1fr)',
            gridTemplateAreas: '"board board" "left right"',
          },
          [THREE_ZONES]: {
            gap: ZONES_GAP,
            gridTemplateColumns: `${SIDE_ZONE_WIDTH} minmax(0, 1fr) ${SIDE_ZONE_WIDTH}`,
            gridTemplateRows: 'minmax(0, 1fr)',
            gridTemplateAreas: '"left board right"',
          },
        }}
      >
        <Box sx={zoneSx('left', left === undefined, 2)}>{left}</Box>

        {/* Nothing in a document when a screen puts nothing there, as the
            template's `.zone-middle` is not drawn empty. From a tablet up it is
            still the row the board would stand in, across the top. On a phone
            it is the first thing under the header. */}
        <Box
          sx={{
            order: -1,
            minWidth: 0,
            ...(children === undefined && { display: 'none' }),
            [APP_SHELL]: {
              order: 0,
              display: 'block',
              gridArea: 'board',
              minHeight: 0,
              overflowY: 'auto',
            },
            // A size container in width, so that the board can take the
            // drawing's height off its own: the drawing is as tall as this
            // zone is wide (`board-geometry.ts`).
            [THREE_ZONES]: { containerType: 'inline-size' },
          }}
        >
          {children}
        </Box>

        <Box sx={zoneSx('right', right === undefined, 1)}>{right}</Box>
      </Box>
    </Box>
  );
};
