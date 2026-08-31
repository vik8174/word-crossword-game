import { clamp } from './brushwork';
import { GATE } from './locations';
import {
  frameFor,
  GATE_LINTEL_RISE,
  LANDMARKS,
  type Point,
  toScreen,
  type Viewport,
} from './world';

/**
 * Where the two things that stand at the gate go.
 *
 * The landing page is a picture with one action in it, so neither of them is in
 * a corner: the name of the game hangs in the air over the lintel, and the one
 * button stands in the opening between the posts. Both are worked out from
 * where the torii actually is in the world, which is why they stay where they
 * are put when the window changes shape — and why they will travel with the
 * gate when there is a camera to travel with.
 *
 * It is arithmetic over two numbers and no DOM, so it can be held to something.
 * What it decides is the one thing a screenshot cannot argue with: that at
 * 1440, at 834 and at 375 the name is over the gate rather than off the edge of
 * it.
 */

/** How far above the foot of the gate the middle of its opening is, in world units. */
const GATE_OPENING_RISE = 190;

/** How near the edge of the window either of them is allowed to come. */
const MARGIN = 180;

/** How much air is kept above the name, and below it before the lintel. */
const TITLE_MARGIN = { top: 56, bottom: 200 } as const;

/** Where the gate's own furniture sits in the window. */
export interface GateChrome {
  /** The middle of the game's name, in CSS pixels from the top left. */
  readonly title: Point;
  /** The middle of the one thing there is to do, in the opening of the gate. */
  readonly action: Point;
}

/**
 * Both of them, for a window of this size.
 *
 * The name is put halfway between the top of the window and the top of the
 * lintel, so what places it is the air above the gate rather than a distance
 * from the top of the screen: a shallow window has less of that air and the
 * name comes down with it.
 *
 * Everything is held away from the edges, because a phone sees a narrow slice
 * of the world and the gate can be most of the way out of it.
 *
 * @param viewport - How big the window is
 * @returns Where the name and the button go
 *
 * @example
 * const { title, action } = gateChrome(useViewport());
 */
export const gateChrome = (viewport: Viewport): GateChrome => {
  const frame = frameFor(GATE, viewport);
  const across = Math.min(MARGIN, viewport.width / 2);
  const lintel = toScreen(
    { x: LANDMARKS.gate.x, y: LANDMARKS.gate.y - GATE_LINTEL_RISE },
    frame,
    viewport,
  );
  const opening = toScreen(
    { x: LANDMARKS.gate.x, y: LANDMARKS.gate.y - GATE_OPENING_RISE },
    frame,
    viewport,
  );

  return {
    title: {
      x: clamp(lintel.x, across, viewport.width - across),
      y: clamp(
        lintel.y / 2,
        TITLE_MARGIN.top,
        Math.max(TITLE_MARGIN.top, viewport.height - TITLE_MARGIN.bottom),
      ),
    },
    action: {
      x: clamp(opening.x, across, viewport.width - across),
      y: clamp(opening.y, 100, Math.max(100, viewport.height - 80)),
    },
  };
};
