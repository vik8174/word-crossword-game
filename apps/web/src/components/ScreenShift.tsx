import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { type ReactNode, useEffect, useState } from 'react';

import {
  REDUCED_MOTION_QUERY,
  SHIFT_DISTANCE,
  SHIFT_DURATION_MS,
  type ShiftRole,
  ShiftRoleContext,
} from './screen-shift';

/**
 * The screen coming in, over the one it replaces.
 *
 * It travels from the right and the screen it replaces goes off to the left, so
 * the two together read as one direction of travel. A room only ever moves
 * forwards — a lobby becomes a game, a game ends — so there is no second
 * direction to draw and none is written.
 */
const ARRIVES = {
  animation: `room-screen-arrives ${SHIFT_DURATION_MS}ms ease-out`,
  '@keyframes room-screen-arrives': {
    from: { opacity: 0, transform: `translateX(${SHIFT_DISTANCE})` },
    to: { opacity: 1, transform: 'translateX(0)' },
  },
} as const;

/**
 * The screen on its way out.
 *
 * Held at its last frame rather than snapping back into view for the instant
 * between the animation ending and the element being taken off the page.
 */
const LEAVES = {
  animation: `room-screen-leaves ${SHIFT_DURATION_MS}ms ease-in forwards`,
  '@keyframes room-screen-leaves': {
    from: { opacity: 1, transform: 'translateX(0)' },
    to: { opacity: 0, transform: `translateX(-${SHIFT_DISTANCE})` },
  },
} as const;

/** The screen this is showing, as it was last built. */
interface ShownScreen {
  readonly key: string;
  readonly screen: ReactNode;
  /** Whether it came in over another screen, rather than being the first of all. */
  readonly isArriving: boolean;
}

/** A screen that is no longer the screen, frozen exactly as it last stood. */
interface LeavingScreen {
  /** The key it was shown under, which is what it is still reconciled by. */
  readonly key: string;
  /** The element that was on the page, kept by reference so it is not rebuilt. */
  readonly screen: ReactNode;
}

/** One of the one or two screens on the page, and how it is drawn. */
interface ScreenInShift {
  readonly key: string;
  readonly role: ShiftRole;
  readonly motion?: typeof ARRIVES | typeof LEAVES;
  readonly screen: ReactNode;
}

interface ScreenShiftProps {
  /**
   * What is being shown, said as a value that changes only when the screen
   * does.
   *
   * This is the whole of the ticket. A room redraws roughly every seven seconds
   * for the length of a game, because every client rewrites its presence mark
   * every fifteen ({@link usePresenceHeartbeat},
   * `docs/decisions/0022-a-mark-a-player-writes-for-themselves.md`), and a shift
   * hanging off a render would flicker through all of it. It would also flicker
   * nowhere a developer would see it: a machine with one player receives no
   * snapshots at all.
   */
  readonly shiftKey: string;
  /** The screen itself, rebuilt on every snapshot and shifted on none of them. */
  readonly children: ReactNode;
}

/**
 * Two screens for as long as it takes one to replace the other.
 *
 * The screen that was stays on the page for {@link SHIFT_DURATION_MS} and is
 * drawn underneath the one arriving, which is what makes this a shift rather
 * than a redraw. It is kept by reference and never rebuilt, so nothing about it
 * re-runs on the way out: the client that was watching for the end of a game
 * does not write the ending twice, and the room keeps its one heartbeat, which
 * lives above this and is not touched by it.
 *
 * It is also made `inert`. Both screens are in the document at once and a square
 * of the grid takes the focus onto itself the moment it becomes the cursor,
 * before the browser paints, so that a phone opens its keyboard
 * ({@link GridSquare}, `docs/decisions/0016-the-cursor-lives-in-the-grid.md`).
 * Two live grids would pull the focus between them, which on a phone is a
 * keyboard flickering.
 *
 * Somebody who turned animation off in their operating system gets neither: the
 * screen simply becomes the next one, with nothing else ever on the page beside
 * it. That is `prefers-reduced-motion` switching movement off rather than
 * slowing it down, and it is not an in-app option
 * (`docs/decisions/0030-where-movement-is-allowed.md`).
 *
 * The first screen of all arrives without movement. A page being opened is not
 * a screen changing — there was no screen before it — and a spinner sliding in
 * would be movement with nothing to say.
 *
 * @param props.shiftKey - What is being shown, as a value that changes only when it does
 * @param props.children - The screen to draw
 *
 * @example
 * <ScreenShift shiftKey={screen.kind}>
 *   <RoomScreenView screen={screen} … />
 * </ScreenShift>
 */
export const ScreenShift = ({ shiftKey, children }: ScreenShiftProps) => {
  const isStill = useMediaQuery(REDUCED_MOTION_QUERY);
  const [shown, setShown] = useState<ShownScreen>({
    key: shiftKey,
    screen: children,
    isArriving: false,
  });
  const [leaving, setLeaving] = useState<LeavingScreen | null>(null);

  if (shiftKey !== shown.key) {
    // The screen has changed, which is the one thing a shift is played for. The
    // screen it replaces is kept exactly as it was rather than rebuilt from the
    // room that has since arrived: it is on its way out, and a game rebuilt to
    // be shown for a fifth of a second is a game running twice.
    if (!isStill) {
      setLeaving({ key: shown.key, screen: shown.screen });
    }

    setShown({ key: shiftKey, screen: children, isArriving: !isStill });
  } else if (children !== shown.screen) {
    // The same screen, built again from a newer room — a snapshot, of which
    // there is one every seven seconds or so all game. Nothing moves; the
    // screen is only kept current, so that whenever it does give way it is its
    // last state that stays on the page behind the next one.
    setShown({ ...shown, screen: children });
  }

  useEffect(() => {
    if (leaving === null) {
      return undefined;
    }

    const timer = window.setTimeout(() => setLeaving(null), SHIFT_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [leaving]);

  // One list with keys rather than two slots, and that is not a style: React
  // keeps a keyed child across a move within the same list, and would rebuild it
  // across two. Rebuilding is the one thing the screen on its way out must not
  // do — it would remount a whole game, effects and all, to be shown for a fifth
  // of a second. The one leaving comes first so that the one arriving is drawn
  // over it.
  const screens: readonly ScreenInShift[] = [
    ...(leaving === null
      ? []
      : [{ key: leaving.key, role: 'leaving' as const, motion: LEAVES, screen: leaving.screen }]),
    {
      key: shown.key,
      role: leaving === null ? ('settled' as const) : ('arriving' as const),
      // Taken from the screen's own arrival rather than from whether a shift is
      // running, so the rule does not change under an animation that is playing.
      motion: shown.isArriving ? ARRIVES : undefined,
      screen: shown.screen,
    },
  ];

  return (
    // The two screens are stacked in one cell rather than positioned, so the
    // room is still a document that scrolls on a phone and an application with a
    // fixed height above it (`room-layout.ts`). `clip` rather than `hidden`,
    // which would make a scroll container of this and take the page's own scroll
    // away on a phone.
    <Box sx={{ display: 'grid', overflowX: 'clip' }}>
      {screens.map(({ key, role, motion, screen }) => (
        <Box
          key={key}
          inert={role === 'leaving'}
          // `inert` already takes it out of the accessibility tree wherever it
          // is understood; this says the same thing to the browsers where it is
          // not, and an after-image of a screen is exactly what nobody should be
          // read twice.
          aria-hidden={role === 'leaving' ? true : undefined}
          sx={{ gridArea: '1 / 1', ...motion }}
        >
          <ShiftRoleContext value={role}>{screen}</ShiftRoleContext>
        </Box>
      ))}
    </Box>
  );
};
