import type { Viewport } from './world';

/**
 * What the garden's two canvases have in common: where they sit, and how a
 * bitmap is kept the size of the window it is stretched over.
 *
 * Two files draw through this and one lays a colour over them, which is why it
 * is a file rather than three copies of the same six properties.
 */

/**
 * How long the weather takes to go, and to come back.
 *
 * Long enough that the board arrives on a background already settling rather
 * than one that snapped off behind it, and short enough to be over before
 * anybody has read the first clue.
 */
export const FADE_MS = 700;

/**
 * Where the three layers of the garden sit relative to the page.
 *
 * All three are behind everything the app draws and above the paper the page is
 * printed on: a negative layer is painted after the root's own background and
 * before anything in the flow above it. They are three numbers rather than one
 * because the order between them is the picture — the place furthest back, the
 * weather in front of it, and the dimming over both.
 */
export const LAYERS = { scene: -3, petals: -2, veil: -1 } as const;

/**
 * What every layer of the garden has in common: fixed to the window, and not
 * there to be touched.
 *
 * @param zIndex - Which of the three it is
 * @returns The styles all three share
 */
export const layerSx = (zIndex: number) =>
  ({
    position: 'fixed',
    inset: 0,
    width: '100%',
    height: '100%',
    zIndex,
    pointerEvents: 'none',
  }) as const;

/**
 * The canvas resized to the window it is drawn in, and the window that is.
 *
 * The element is stretched by CSS and the bitmap behind it is not, so on any
 * screen with more than one device pixel to a CSS pixel everything would be
 * drawn once and then blown up. Everything above this line works in CSS pixels
 * and the transform is what keeps it able to.
 *
 * @param element - The canvas
 * @param brush - Its drawing context
 * @returns The window, in CSS pixels
 *
 * @example
 * const viewport = fitToWindow(element, brush);
 */
export const fitToWindow = (
  element: HTMLCanvasElement,
  brush: CanvasRenderingContext2D,
): Viewport => {
  const viewport: Viewport = { width: element.clientWidth, height: element.clientHeight };
  const dots = window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
  const width = Math.round(viewport.width * dots);
  const height = Math.round(viewport.height * dots);

  // Assigning either of these clears the canvas, so it is done only when the
  // window has actually changed size rather than on every frame.
  if (element.width !== width || element.height !== height) {
    element.width = width;
    element.height = height;
  }

  brush.setTransform(dots, 0, 0, dots, 0, 0);

  return viewport;
};
