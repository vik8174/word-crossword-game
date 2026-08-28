import type { Petal, Sky } from './petals';

/**
 * The part of a canvas the garden draws through, and nothing else.
 *
 * Narrowed to nine calls and two properties rather than taken as a whole
 * `CanvasRenderingContext2D` for one reason: a browser context satisfies this
 * without being told to, and so does an object a test can read back. Nothing
 * here has to be cast, and nothing about the drawing has to be guessed at from
 * a screenshot.
 */
export interface PetalBrush {
  clearRect(x: number, y: number, width: number, height: number): void;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  scale(x: number, y: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  quadraticCurveTo(controlX: number, controlY: number, x: number, y: number): void;
  fill(): void;
  globalAlpha: number;
  fillStyle: string | CanvasGradient | CanvasPattern;
}

/** How wide a petal is against its length, and where its widest point sits. */
const PETAL_WIDTH = 0.85;
const PETAL_WAIST = -0.15;

/** How nearly edge-on a petal is allowed to turn before it stops being drawn at all. */
const THINNEST_TURN = 0.25;

/**
 * One petal, drawn where it is and turned the way it is facing.
 *
 * Two curves meeting at a point on either end, which is a petal rather than the
 * ellipse it would otherwise be worth being. It is also squeezed by where the
 * petal is in its sideways wander, so a petal drifting one way turns edge-on to
 * the reader on the way — that is the whole difference between petals falling
 * and discs falling, and it costs one multiplication.
 *
 * @param brush - What is being drawn through
 * @param petal - The petal
 */
const paintPetal = (brush: PetalBrush, petal: Petal): void => {
  brush.save();
  brush.translate(petal.x, petal.y);
  brush.rotate(petal.angle);
  brush.scale(Math.max(Math.abs(Math.cos(petal.phase)), THINNEST_TURN), 1);
  brush.globalAlpha = petal.ink;
  brush.beginPath();
  brush.moveTo(0, -petal.size);
  brush.quadraticCurveTo(petal.size * PETAL_WIDTH, petal.size * PETAL_WAIST, 0, petal.size);
  brush.quadraticCurveTo(-petal.size * PETAL_WIDTH, petal.size * PETAL_WAIST, 0, -petal.size);
  brush.fill();
  brush.restore();
};

/**
 * The whole sky, drawn over whatever was there a frame ago.
 *
 * The frame is cleared rather than drawn over with the page's own colour: this
 * canvas is behind the app and shows the paper through itself, so painting a
 * background here would put a second sheet of it over the first and any
 * difference between the two would be a rectangle nobody asked for.
 *
 * @param brush - What is being drawn through
 * @param petals - The sky as it stands
 * @param sky - The area being cleared and drawn into
 * @param colour - The one colour every petal is drawn in, from the theme
 *
 * @example
 * paintPetals(context, petals, sky, theme.palette.sakura.main);
 */
export const paintPetals = (
  brush: PetalBrush,
  petals: readonly Petal[],
  sky: Sky,
  colour: string,
): void => {
  brush.clearRect(0, 0, sky.width, sky.height);
  brush.fillStyle = colour;

  for (const petal of petals) {
    paintPetal(brush, petal);
  }
};
