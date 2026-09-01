import { type SceneBrush, slab } from './brushwork';
import { SCENE } from './scene-palette';
import { GATE_LINTEL_RISE, inFrame, LANDMARKS, type Rect } from './world';

/**
 * The two built things in the forest that are not the temple: the torii a
 * visitor arrives through, and the stone lantern on the way to the doors.
 *
 * Their own file because they are the only part of the forest that is
 * architecture. Everything else in `paint-forest.ts` is weather and leaves,
 * drawn from a seed and answering to the planes; these two are drawn from
 * measurements, stand in one place each, and are what the world's landmarks are
 * named after (`world.ts`).
 */

/**
 * The torii: two vermilion posts and a lintel that lifts at both ends.
 *
 * The lift is the whole silhouette. Everything else about the gate could be
 * done with rectangles, and the one thing that could not is the curve, so it is
 * the one thing drawn as a path.
 *
 * @param brush - What is being drawn through
 */
const paintGate = (brush: SceneBrush): void => {
  const { x, y } = LANDMARKS.gate;
  const half = 200;
  const top = y - GATE_LINTEL_RISE + 6;

  slab(brush, { x, y: y + 16, width: half * 2 + 130, height: 30 }, SCENE.night, 0.45);

  for (const side of [-1, 1]) {
    slab(brush, { x: x + side * half, y: y - 215, width: 40, height: 430 }, SCENE.vermilionDeep);
    slab(
      brush,
      { x: x + side * half - 11, y: y - 215, width: 15, height: 430 },
      SCENE.vermilionLit,
      0.75,
    );
    slab(brush, { x: x + side * half, y: y - 6, width: 62, height: 22 }, SCENE.stoneDark);
  }

  slab(brush, { x, y: y - 310, width: half * 2 + 40, height: 26 }, SCENE.vermilion);

  brush.save();
  brush.globalAlpha = 1;
  brush.beginPath();
  brush.moveTo(x - half - 120, top - 6);
  brush.quadraticCurveTo(x, top + 44, x + half + 120, top - 6);
  brush.lineTo(x + half + 120, top + 30);
  brush.quadraticCurveTo(x, top + 78, x - half - 120, top + 30);
  brush.closePath();
  brush.fillStyle = SCENE.vermilionDeep;
  brush.fill();

  brush.globalAlpha = 0.85;
  brush.beginPath();
  brush.moveTo(x - half - 120, top - 6);
  brush.quadraticCurveTo(x, top + 44, x + half + 120, top - 6);
  brush.lineTo(x + half + 120, top + 8);
  brush.quadraticCurveTo(x, top + 58, x - half - 120, top + 8);
  brush.closePath();
  brush.fillStyle = SCENE.vermilionLit;
  brush.fill();
  brush.restore();
};

/**
 * The stone lantern between the gate and the temple.
 *
 * @param brush - What is being drawn through
 */
const paintLantern = (brush: SceneBrush): void => {
  const { x, y } = LANDMARKS.lantern;

  slab(brush, { x, y: y - 46, width: 34, height: 92 }, SCENE.stoneDark);
  slab(brush, { x, y: y - 100, width: 104, height: 22 }, SCENE.stone);
  slab(brush, { x, y: y - 136, width: 84, height: 54 }, SCENE.stone);
  slab(brush, { x, y: y - 136, width: 46, height: 32 }, SCENE.sun, 0.9);
  slab(brush, { x, y: y - 172, width: 122, height: 20 }, SCENE.stoneDark);
  slab(brush, { x, y: y - 190, width: 26, height: 20 }, SCENE.stoneDark);
};

/**
 * The gate and the lantern, each painted only if the window is showing it.
 *
 * @param brush - What is being drawn through
 * @param frame - The part of the world being shown
 *
 * @example
 * paintLandmarks(brush, frame);
 */
export const paintLandmarks = (brush: SceneBrush, frame: Rect): void => {
  if (
    inFrame(frame, { x: LANDMARKS.lantern.x, y: LANDMARKS.lantern.y - 100, across: 70, down: 110 })
  ) {
    paintLantern(brush);
  }

  if (
    inFrame(frame, {
      x: LANDMARKS.gate.x,
      y: LANDMARKS.gate.y - GATE_LINTEL_RISE / 2,
      across: 330,
      down: GATE_LINTEL_RISE / 2 + 40,
    })
  ) {
    paintGate(brush);
  }
};
