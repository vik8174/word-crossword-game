import { useEffect, useState } from 'react';

import type { Viewport } from './world';

/**
 * Where a thing in the world is on the screen, for anything that is not drawn
 * on the canvas.
 *
 * The name of the game hangs over the gate rather than in a corner, and it goes
 * on hanging there when the window changes shape or the camera moves. That
 * cannot be done in CSS: the gate is at a place in a painting, and where that
 * place lands depends on which part of the world the window is showing.
 *
 * It is a hook and not a measurement of the DOM on purpose. Nothing is read
 * back off the page, so there is no first frame drawn in the wrong position and
 * nothing here can be made to reflow anything.
 */

/** How big the window is right now. */
const readViewport = (): Viewport => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

/**
 * The window, and any change to it.
 *
 * @returns Its width and height in CSS pixels
 *
 * @example
 * const viewport = useViewport();
 */
export const useViewport = (): Viewport => {
  const [viewport, setViewport] = useState(readViewport);

  useEffect(() => {
    const answer = () => setViewport(readViewport());

    // Asked again on mount as well as on every change: a window resized before
    // React got to this line would otherwise be measured as it was.
    answer();
    window.addEventListener('resize', answer);

    return () => window.removeEventListener('resize', answer);
  }, []);

  return viewport;
};
