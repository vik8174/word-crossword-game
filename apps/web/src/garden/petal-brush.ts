import type { Petal, Sky } from './petals';

/**
 * The part of a canvas the garden draws petals through, and nothing else.
 *
 * Narrowed to nine calls and two properties rather than taken as a whole
 * `CanvasRenderingContext2D` for one reason: a browser context satisfies this
 * without being told to, and so does an object a test can read back. Nothing
 * here has to be cast, and nothing about the drawing has to be guessed at from
 * a screenshot.
 *
 * This file used to be `paint-petals.ts`, and drew each petal against a
 * doorway rectangle that culled the ones falling "indoors" — a rule that made
 * sense while the scene was one continuous painted world with a camera moving
 * through it (issue #115, ADR 0031). Issue #152 replaces that world with three
 * separate pictures switched by which screen is showing, so there is no
 * doorway rectangle left to cull against: a petal is either on screen, over
 * whichever picture is currently shown, or it is not drawn at all because the
 * whole layer has faded out (`PetalLayer.tsx`, `room-air.ts`).
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

/**
 * How wide a petal is against its length, and where its widest point sits.
 *
 * The template's own shape (issue #190): wider across and waisted closer to
 * its centre than the app drew before, which is what turns the mark into
 * something that reads as a petal rather than as a plain leaf-shaped speck.
 */
const PETAL_WIDTH = 1.05;
const PETAL_WAIST = -0.02;

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
 * Drawn in its own {@link Petal.tone} rather than in one colour handed to the
 * whole sky (issue #190): three tones at random per petal, from the template,
 * read as petals falling through the picture rather than as one repeated mark.
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
  brush.fillStyle = petal.tone;
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
 * The frame is cleared rather than drawn over with a colour: this canvas is
 * between the picture and the app, so painting a background here would put a
 * sheet over the garden and any difference between the two would be a rectangle
 * nobody asked for. No colour is handed in any more (issue #190): each petal
 * carries its own {@link Petal.tone}, so there is nothing left for one call to
 * set before the loop.
 *
 * @param brush - What is being drawn through
 * @param petals - The sky as it stands
 * @param sky - The area being cleared and drawn into
 *
 * @example
 * paintPetals(context, petals, sky);
 */
export const paintPetals = (brush: PetalBrush, petals: readonly Petal[], sky: Sky): void => {
  brush.clearRect(0, 0, sky.width, sky.height);

  for (const petal of petals) {
    paintPetal(brush, petal);
  }
};
