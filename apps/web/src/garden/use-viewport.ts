import { useEffect, useState } from 'react';

import type { Viewport } from './canvas-layer';

/**
 * How big the window is, for anything that has to work it out in JavaScript
 * rather than in CSS.
 *
 * Its one caller today is the greeting cloth: {@link RewardCloth} paints a
 * banner on a `<canvas>`, and a canvas has no CSS to size a shape with, so the
 * band the banner hangs in ({@link clothBand}) has to be worked out in code
 * from how big the window actually is.
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
