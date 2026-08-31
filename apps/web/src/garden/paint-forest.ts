import { foliage, type SceneBrush, seeded, slab, stroke, topOf, trunk } from './brushwork';
import { spreadOf } from './colour-spread';
import { airOf } from './paint-planes';
import { SCENE } from './scene-palette';
import { GATE_LINTEL_RISE, inFrame, LANDMARKS, type Rect } from './world';

/**
 * The forest the temple stands in: the air, the water, the gate, and the leaves
 * that hang into every frame.
 *
 * It is painted in the order light reaches it — the air furthest back, then the
 * canopy behind everything, then the things on the ground, then the leaves
 * nearest the reader, which are nearly black because they are between the
 * reader and the light. That order is the whole of the depth: nothing here is
 * scaled or offset by distance, and it does not need to be.
 */

/** Leaves between the reader and the light, which catch almost none of it. */
const NEAR_LEAF = [
  SCENE.barkDeep,
  SCENE.night,
  SCENE.deep,
  SCENE.shade,
  SCENE.moss,
  SCENE.leaf,
] as const;

/** Leaves at a distance, where colour has gone out of them. */
const FAR_LEAF = [SCENE.night, SCENE.deep, SCENE.shade, SCENE.moss] as const;

/**
 * How far past the window anything covering it is drawn, in world units.
 *
 * A rectangle cut to exactly the frame lands on the edge of the canvas, and the
 * edge of a canvas is where a browser is entitled to blend. One unit is under a
 * pixel at every magnification this app uses, and it is the difference between
 * a sky and a sky with a hairline round it.
 */
const BLEED = 2;

/** Leaves close enough to have colour, but not close enough to be dark. */
const MID_LEAF = [SCENE.deep, SCENE.shade, SCENE.moss, SCENE.leaf, SCENE.fresh] as const;

/**
 * The light that gets through the canopy, and the dark it leaves behind.
 *
 * @param brush - What is being drawn through
 */
const paintAir = (brush: SceneBrush, frame: Rect): void => {
  brush.save();
  brush.globalAlpha = 1;

  // The gradient is measured down the whole world, because that is what makes
  // the air the same air wherever the window is standing, and it is the same
  // gradient every sheet between two planes is laid in ({@link airOf}). Only
  // the covering is cut to the window.
  brush.fillStyle = airOf(brush);
  brush.fillRect(
    frame.x - BLEED,
    frame.y - BLEED,
    frame.width + BLEED * 2,
    frame.height + BLEED * 2,
  );

  // The shaft behind the temple. It is the reason the eye goes there before it
  // goes anywhere else, and the reason the building is legible at all against a
  // wall of green.
  const shaft = brush.createRadialGradient(2150, 500, 60, 2150, 780, 1400);
  shaft.addColorStop(0, 'rgba(251, 243, 201, 0.5)');
  shaft.addColorStop(1, 'rgba(251, 243, 201, 0)');
  brush.fillStyle = shaft;
  brush.fillRect(
    frame.x - BLEED,
    frame.y - BLEED,
    frame.width + BLEED * 2,
    frame.height + BLEED * 2,
  );

  brush.restore();
};

/**
 * The water: teal under a clip, with the light moving across it.
 *
 * @param brush - What is being drawn through
 * @param frame - The part of the world being shown
 */
export const paintWater = (brush: SceneBrush, frame: Rect): void => {
  if (!inFrame(frame, { x: LANDMARKS.pond.x, y: LANDMARKS.pond.y, across: 750, down: 120 })) {
    return;
  }

  const random = seeded(4114);
  const width = 1500;
  const height = 240;
  const { x, y } = LANDMARKS.pond;

  brush.save();
  brush.globalAlpha = 1;
  brush.beginPath();
  brush.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
  brush.clip();
  brush.fillStyle = SCENE.teal;
  brush.fillRect(x - width / 2, y - height / 2, width, height);

  for (let index = 0; index < 160; index += 1) {
    const pick = random();

    stroke(
      brush,
      {
        x: x + (random() - 0.5) * width,
        y: y + (random() - 0.5) * height,
        length: 40 + random() * 130,
        width: 6 + random() * 12,
        angle: (random() - 0.5) * 0.12,
      },
      pick > 0.82 ? SCENE.tealLit : pick > 0.5 ? SCENE.water : SCENE.shade,
      0.3 + random() * 0.5,
    );
  }

  brush.restore();
};

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
 * A mass of leaves, written the way the picture describes one.
 *
 * The ramp is the plain list of colours rather than a spread, because the
 * spread is the same object for every mass drawn from the same ramp and is
 * looked up once here rather than held in nine places.
 */
interface Mass {
  readonly x: number;
  readonly y: number;
  readonly across: number;
  readonly down: number;
  readonly seed: number;
  readonly count: number;
  readonly size: number;
}

/**
 * One mass, painted only if the window is showing any of it.
 *
 * A mass scatters its strokes as far as its own reach, and a stroke is up to
 * about one and a half leaves long, so the box asked about is the reach with a
 * leaf added on every side.
 *
 * @param brush - What is being drawn through
 * @param frame - The part of the world being shown
 * @param mass - The mass
 * @param ramp - Its colours, dark to light
 * @param alpha - How solid it is
 */
const paintMass = (
  brush: SceneBrush,
  frame: Rect,
  mass: Mass,
  ramp: readonly string[],
  alpha: number,
): void => {
  if (
    !inFrame(frame, {
      x: mass.x,
      y: mass.y,
      across: mass.across + mass.size,
      down: mass.down + mass.size,
    })
  ) {
    return;
  }

  foliage(brush, { ...mass, colours: spreadOf(ramp), alpha });
};

/**
 * The air, and the canopy furthest back in it.
 *
 * The water is no longer here. It lies in front of four of the six planes and
 * behind two, so where it is painted is a decision about depth and belongs with
 * the rest of them, in {@link paintScene}.
 *
 * @param brush - What is being drawn through
 * @param frame - The part of the world being shown
 *
 * @example
 * paintBackground(brush, frame);
 */
export const paintBackground = (brush: SceneBrush, frame: Rect): void => {
  paintAir(brush, frame);

  for (const mass of [
    { x: 900, y: 420, across: 1000, down: 380, seed: 101, count: 200, size: 78 },
    { x: 2600, y: 400, across: 900, down: 360, seed: 202, count: 180, size: 78 },
  ]) {
    paintMass(brush, frame, mass, FAR_LEAF, 0.85);
  }
};

/**
 * The gate, the lantern and the bushes between the reader and the temple.
 *
 * @param brush - What is being drawn through
 * @param frame - The part of the world being shown
 */
export const paintMiddleGround = (brush: SceneBrush, frame: Rect): void => {
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

  // Written in the order they are painted rather than grouped by colour: a
  // mass laid over another is the picture, so the order is not a detail of how
  // the list is spelled.
  for (const mass of [
    { x: 520, y: 1210, across: 620, down: 250, seed: 303, count: 220, size: 62, ramp: MID_LEAF },
    { x: 2700, y: 1240, across: 640, down: 230, seed: 404, count: 210, size: 62, ramp: MID_LEAF },
    { x: 1500, y: 1380, across: 900, down: 170, seed: 505, count: 180, size: 66, ramp: FAR_LEAF },
    { x: 1850, y: 1250, across: 380, down: 150, seed: 606, count: 120, size: 54, ramp: MID_LEAF },
  ]) {
    paintMass(brush, frame, mass, mass.ramp, 0.95);
  }
};

/**
 * The tree that frames the right of the picture, and the leaves that hang into
 * the top of every frame wherever the camera stands.
 *
 * This is what keeps a magnified frame from looking like a crop: at any place
 * in the world there is something dark and near at the edge of the window, so
 * the reader is always looking *through* the forest at the thing in the middle.
 *
 * @param brush - What is being drawn through
 * @param frame - The part of the world being shown
 */
export const paintForeground = (brush: SceneBrush, frame: Rect): void => {
  // Where the top of the framing tree lands is where one of the masses below
  // hangs from, so it is worked out whether or not the tree itself is inside
  // the window. A crown that moved when the camera did would be a different
  // forest at every magnification.
  // A hundred and ten rather than the hundred and ninety it used to be: the
  // number is now how thick the tree is, where before it was how tall each
  // piece of it was drawn and the thickness fell out of the step
  // ({@link trunkOf}). This is the width it was actually coming out at.
  const tree = { x: LANDMARKS.trunk.x, base: LANDMARKS.trunk.y, top: 120, width: 110, seed: 808 };
  const top = topOf(tree);

  if (
    inFrame(frame, {
      x: tree.x,
      y: (tree.base + tree.top) / 2,
      across: 240,
      down: (tree.base - tree.top) / 2 + 60,
    })
  ) {
    trunk(brush, tree, { lit: SCENE.bark, dark: SCENE.barkDeep });
  }

  // The two boughs that leave it are asked about separately, because they reach
  // seven hundred units in front of the tree and are still in the window at the
  // doors of the temple when the trunk they come off is not.
  for (const bough of [
    { x: top - 260, y: 340, length: 700, width: 84, angle: 0.42, colour: SCENE.barkDeep, alpha: 1 },
    { x: top - 90, y: 620, length: 460, width: 60, angle: 1.05, colour: SCENE.bark, alpha: 0.95 },
  ]) {
    if (
      inFrame(frame, {
        x: bough.x,
        y: bough.y,
        across: bough.length / 2 + bough.width,
        down: bough.length / 2 + bough.width,
      })
    ) {
      stroke(brush, bough, bough.colour, bough.alpha);
    }
  }

  for (const mass of [
    { x: top - 420, y: 300, across: 460, down: 320, seed: 909, count: 260, size: 64 },
    { x: 260, y: 300, across: 640, down: 360, seed: 1010, count: 230, size: 76 },
    { x: 1080, y: 190, across: 700, down: 330, seed: 1111, count: 210, size: 76 },
    { x: 1980, y: 150, across: 760, down: 300, seed: 1212, count: 200, size: 76 },
    { x: 2860, y: 250, across: 700, down: 340, seed: 1313, count: 210, size: 76 },
    { x: 640, y: 620, across: 300, down: 190, seed: 1414, count: 100, size: 62 },
    { x: 2480, y: 560, across: 280, down: 200, seed: 1515, count: 90, size: 62 },
    // The two that hang into the top corners of the frame at the doors of the
    // temple. Without them that frame opens on the grey of the roof, which is
    // the one light thing in the forest, and the name of the step is lettered
    // in cream with nothing behind it but the picture.
    { x: 1780, y: 600, across: 300, down: 220, seed: 1616, count: 120, size: 66 },
    { x: 2540, y: 620, across: 300, down: 230, seed: 1717, count: 120, size: 66 },
  ]) {
    paintMass(brush, frame, mass, NEAR_LEAF, 0.97);
  }
};
