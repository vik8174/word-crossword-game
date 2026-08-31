import { foliage, type SceneBrush, seeded, slab, stroke, trunk } from './brushwork';
import { SCENE } from './scene-palette';
import { GATE_LINTEL_RISE, LANDMARKS, WORLD } from './world';

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

/** Leaves close enough to have colour, but not close enough to be dark. */
const MID_LEAF = [SCENE.deep, SCENE.shade, SCENE.moss, SCENE.leaf, SCENE.fresh] as const;

/**
 * The light that gets through the canopy, and the dark it leaves behind.
 *
 * @param brush - What is being drawn through
 */
const paintAir = (brush: SceneBrush): void => {
  brush.save();
  brush.globalAlpha = 1;

  const air = brush.createLinearGradient(0, 0, 0, WORLD.height);
  air.addColorStop(0, SCENE.deep);
  air.addColorStop(0.42, SCENE.shade);
  air.addColorStop(1, SCENE.night);
  brush.fillStyle = air;
  brush.fillRect(0, 0, WORLD.width, WORLD.height);

  // The shaft behind the temple. It is the reason the eye goes there before it
  // goes anywhere else, and the reason the building is legible at all against a
  // wall of green.
  const shaft = brush.createRadialGradient(2150, 500, 60, 2150, 780, 1400);
  shaft.addColorStop(0, 'rgba(251, 243, 201, 0.5)');
  shaft.addColorStop(1, 'rgba(251, 243, 201, 0)');
  brush.fillStyle = shaft;
  brush.fillRect(0, 0, WORLD.width, WORLD.height);

  brush.restore();
};

/**
 * The water: teal under a clip, with the light moving across it.
 *
 * @param brush - What is being drawn through
 */
const paintWater = (brush: SceneBrush): void => {
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
 * The air, the far canopy, the water and the lantern: everything behind the
 * buildings.
 *
 * @param brush - What is being drawn through
 *
 * @example
 * paintBackground(brush);
 */
export const paintBackground = (brush: SceneBrush): void => {
  paintAir(brush);

  foliage(brush, {
    x: 900,
    y: 420,
    across: 1000,
    down: 380,
    seed: 101,
    colours: FAR_LEAF,
    count: 200,
    size: 78,
    alpha: 0.85,
  });
  foliage(brush, {
    x: 2600,
    y: 400,
    across: 900,
    down: 360,
    seed: 202,
    colours: FAR_LEAF,
    count: 180,
    size: 78,
    alpha: 0.85,
  });

  paintWater(brush);
};

/**
 * The gate, the lantern and the bushes between the reader and the temple.
 *
 * @param brush - What is being drawn through
 */
export const paintMiddleGround = (brush: SceneBrush): void => {
  paintLantern(brush);
  paintGate(brush);

  foliage(brush, {
    x: 520,
    y: 1210,
    across: 620,
    down: 250,
    seed: 303,
    colours: MID_LEAF,
    count: 220,
    size: 62,
    alpha: 0.95,
  });
  foliage(brush, {
    x: 2700,
    y: 1240,
    across: 640,
    down: 230,
    seed: 404,
    colours: MID_LEAF,
    count: 210,
    size: 62,
    alpha: 0.95,
  });
  foliage(brush, {
    x: 1500,
    y: 1380,
    across: 900,
    down: 170,
    seed: 505,
    colours: FAR_LEAF,
    count: 180,
    size: 66,
    alpha: 0.95,
  });
  foliage(brush, {
    x: 1850,
    y: 1250,
    across: 380,
    down: 150,
    seed: 606,
    colours: MID_LEAF,
    count: 120,
    size: 54,
    alpha: 0.95,
  });
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
 */
export const paintForeground = (brush: SceneBrush): void => {
  const top = trunk(
    brush,
    { x: LANDMARKS.trunk.x, base: LANDMARKS.trunk.y, top: 120, width: 190, seed: 808 },
    { lit: SCENE.bark, dark: SCENE.barkDeep },
  );

  stroke(brush, { x: top - 260, y: 340, length: 700, width: 84, angle: 0.42 }, SCENE.barkDeep, 1);
  stroke(brush, { x: top - 90, y: 620, length: 460, width: 60, angle: 1.05 }, SCENE.bark, 0.95);

  for (const mass of [
    { x: top - 420, y: 300, across: 460, down: 320, seed: 909, count: 260, size: 64 },
    { x: 260, y: 300, across: 640, down: 360, seed: 1010, count: 230, size: 76 },
    { x: 1080, y: 190, across: 700, down: 330, seed: 1111, count: 210, size: 76 },
    { x: 1980, y: 150, across: 760, down: 300, seed: 1212, count: 200, size: 76 },
    { x: 2860, y: 250, across: 700, down: 340, seed: 1313, count: 210, size: 76 },
    { x: 640, y: 620, across: 300, down: 190, seed: 1414, count: 100, size: 62 },
    { x: 2480, y: 560, across: 280, down: 200, seed: 1515, count: 90, size: 62 },
  ]) {
    foliage(brush, { ...mass, colours: NEAR_LEAF, alpha: 0.97 });
  }
};
