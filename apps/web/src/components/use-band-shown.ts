import { useSyncExternalStore } from 'react';

import { type BoardShape, bandIsShown } from './board-geometry';

/** The window's size as one string, so that `useSyncExternalStore` compares it by value. */
const windowSize = (): string => `${window.innerWidth}x${window.innerHeight}`;

const watchWindow = (onChange: () => void): (() => void) => {
  window.addEventListener('resize', onChange);

  return () => window.removeEventListener('resize', onChange);
};

/**
 * Whether the drawing above the board is shown, for a board of this shape in
 * this window: `bandIsShown`, asked again whenever the window changes size.
 *
 * It is the one place the room's picture depends on the window's size in
 * JavaScript. Whether the band is worth its height is a question of squares of
 * 36px and up, which depends on the board's shape as well as on the window, and
 * a media query cannot ask that.
 *
 * @param shape - The laid-out crossword's size in squares
 * @returns `true` when the band is drawn
 *
 * @example
 * const showBand = useBandShown({ cols: view.cols, rows: view.rows });
 */
export const useBandShown = (shape: BoardShape): boolean => {
  const size = useSyncExternalStore(watchWindow, windowSize, () => '0x0');
  const [width = 0, height = 0] = size.split('x').map(Number);

  return bandIsShown({ width, height }, shape);
};
