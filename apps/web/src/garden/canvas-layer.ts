/**
 * What the garden's canvases have in common: where they sit, and how a bitmap
 * is kept the size of the window it is stretched over.
 *
 * Two files draw through this and one lays a colour over them, which is why it
 * is a file rather than three copies of the same six properties.
 */

/** The window a canvas is drawn in, in CSS pixels. */
export interface Viewport {
  readonly width: number;
  readonly height: number;
}

/**
 * A rectangle in CSS pixels, given by its top left corner.
 *
 * Used by the greeting cloth to say where its own banner falls in the window
 * (`cloth.ts`, `paint-cloth.ts`). It used to be shared with a second kind of
 * rectangle — a part of the painted world, in world units rather than pixels —
 * before issue #152 removed the world the second kind belonged to.
 */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * How long the weather takes to go, and to come back.
 *
 * The template's own number for this fade (issue #190; `.petals`,
 * `design/templates/state-tree.html` line 237) rather than the app's shorter
 * one: sixteen hundred milliseconds is long enough that the change of air
 * reads as weather settling rather than a layer switching off, and it is no
 * longer shared with anything the crossfade between pictures needs — that is
 * `SCENE_FADE_MS`, its own number in `scene-transition.ts`.
 */
export const FADE_MS = 1600;

/**
 * Where the three layers of the garden sit relative to the page.
 *
 * All three are behind everything the app draws and above the paper the page is
 * printed on: a negative layer is painted after the root's own background and
 * before anything in the flow above it. They are three numbers rather than one
 * because the order between them is the picture — the place furthest back, the
 * dimming over it, and the weather in front of both (issue #190; the weather
 * used to sit behind the dimming, which is why petals barely showed against a
 * picture already put down by it).
 */
export const LAYERS = { scene: -3, veil: -2, petals: -1 } as const;

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
 * Capped at two dots a pixel (issue #190; the template's own cap,
 * `design/templates/state-tree.html` line 1661) rather than left to follow
 * the screen without limit: past two, more dots stop reading as a sharper
 * petal and only cost a phone frames it does not get back.
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
  const dots = Math.min(2, window.devicePixelRatio > 0 ? window.devicePixelRatio : 1);
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
