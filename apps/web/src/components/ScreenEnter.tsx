import Box from '@mui/material/Box';
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { ENTER_MS } from '../motion';

/** What a screen's blocks are, in the order the page reads them (`screen-blocks.ts`). */
const BLOCKS = '[data-rise], [data-rise-children] > *';

interface ScreenEnterProps {
  /**
   * Whether this screen was reached from `playing` within the session, so the
   * fiesta (card, flags, lanterns, confetti) arrives. A screen that is opened
   * by a reload, a new tab or a link shows the fiesta already standing.
   */
  readonly arrivesFromPlay?: boolean;
  /** The screen. */
  readonly children: ReactNode;
}

/**
 * The movement of a screen opening: the one thing on a page that moves for a
 * screen, in place of the shift ADR 0030 decided and
 * `docs/decisions/0039-the-street-wakes-up.md` replaces.
 *
 * It marks the screen `enter` for {@link ENTER_MS} after it mounts, and the
 * rules in `motion-styles.ts` do the rest: the page blocks rise one after
 * another, the shutters swing open, the neighbours lean in, the line is drawn
 * and the cards fade in. It gives the blocks their `--i`, the place each one
 * stands in reading order across the whole screen, counted from 0.
 *
 * A screen is the one place it is mounted under, and a new screen is a new
 * mount: the caller keys it by which screen is showing, so a room that redraws
 * (every snapshot, all game) is not a screen opening, and nothing moves. Once
 * the time is up the mark comes off, so a block that arrives later in the same
 * screen does not rise as if the screen had opened again.
 *
 * It draws no element of its own (`display: contents`), so a screen's layout is
 * the layout it would have had without it. The frame is not inside it: the
 * header is mounted once and never rises (issue #245).
 *
 * @param props.arrivesFromPlay - Whether the fiesta arrives, rather than stands
 * @param props.children - The screen
 *
 * @example
 * <ScreenEnter key={screen.kind} arrivesFromPlay={cameFromPlay}>
 *   <RoomScreenView screen={screen} />
 * </ScreenEnter>
 */
export const ScreenEnter = ({ arrivesFromPlay = false, children }: ScreenEnterProps) => {
  const root = useRef<HTMLDivElement>(null);
  const [isEntering, setIsEntering] = useState(true);

  // Before the first paint, so no block is seen at its resting place and then
  // taken back to rise.
  useLayoutEffect(() => {
    root.current?.querySelectorAll<HTMLElement>(BLOCKS).forEach((block, place) => {
      block.style.setProperty('--i', String(place));
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsEntering(false), ENTER_MS);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <Box
      ref={root}
      className={isEntering ? 'enter' : undefined}
      data-fiesta={arrivesFromPlay ? 'arrives' : undefined}
      sx={{ display: 'contents' }}
    >
      {children}
    </Box>
  );
};
