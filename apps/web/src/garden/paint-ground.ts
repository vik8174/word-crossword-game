import { lerp, type SceneBrush, seeded, stroke } from './brushwork';
import { spreadOf } from './colour-spread';
import { AIR } from './forest-planes';
import { SCENE } from './scene-palette';
import { inFrame, LANDMARKS, type Rect, WORLD } from './world';

/**
 * The ground the planes stand on: a bank behind the water, and a path that
 * goes away from the reader.
 *
 * Six planes of trees with nothing under them are six planes of trees floating,
 * and the picture had exactly that — a band of water along the bottom and then
 * nothing at all between it and the temple. What a bank does that a plane
 * cannot is give the eye a surface to walk along: the path is one shape whose
 * width and whose stones both shrink towards the same place, and a reader who
 * follows it has been told how far away the far end of it is without being
 * shown a single tree.
 *
 * It is drawn between the bank plane and the temple, so the building stands on
 * the far end of it.
 */

/** The stones the path is made of, and the earth it is worn into. */
const PATH_STONE = [SCENE.stoneDark, SCENE.stone] as const;
const BANK_EARTH = [SCENE.night, SCENE.deep, SCENE.stoneDark, SCENE.moss] as const;

/** Where the path comes towards the reader, and where it goes away to. */
const PATH_NEAR = { x: 420, y: 1400, half: 300 } as const;
const PATH_FAR = { x: 1010, y: 1122, half: 44 } as const;

/** How many treads it is laid in. */
const PATH_TREADS = 16;

/**
 * The bank behind the water: earth and moss between the pond and the temple.
 *
 * @param brush - What is being drawn through
 */
const paintBank = (brush: SceneBrush): void => {
  const random = seeded(3301);
  const tones = spreadOf(BANK_EARTH, {
    towards: AIR.bottom,
    haze: 0.08,
    contrast: 0.8,
    jitter: 0.07,
  });
  const top = 1108;
  const bottom = 1232;

  for (let index = 0; index < 190; index += 1) {
    const at = Math.pow(random(), 0.8);
    const y = lerp(top, bottom, at);
    // Longer and heavier towards the reader, which is the same ramp the planes
    // above run and the reason the bank reads as ground rather than as a stripe.
    const step = tones[Math.min(tones.length - 1, Math.floor(random() * tones.length))] ?? [];

    stroke(
      brush,
      {
        x: random() * WORLD.width,
        y,
        length: lerp(46, 150, at) * (0.6 + random() * 0.8),
        width: lerp(7, 20, at),
        angle: (random() - 0.5) * 0.16,
      },
      step[Math.floor(random() * step.length)] ?? SCENE.night,
      0.4 + random() * 0.45,
    );
  }
};

/**
 * The path: sixteen treads, each shorter and thinner than the one before it.
 *
 * The whole of the perspective is that one ramp. Nothing about the treads is
 * projected and nothing is foreshortened by arithmetic — they simply narrow
 * towards a point, and a surface that narrows towards a point is read as going
 * away whatever else is in the picture.
 *
 * @param brush - What is being drawn through
 */
const paintPath = (brush: SceneBrush): void => {
  const random = seeded(3302);
  const tones = spreadOf(PATH_STONE, {
    towards: AIR.bottom,
    haze: 0.1,
    contrast: 0.75,
    jitter: 0.09,
  });

  for (let index = 0; index < PATH_TREADS; index += 1) {
    const at = index / (PATH_TREADS - 1);
    const x = lerp(PATH_NEAR.x, PATH_FAR.x, at);
    const y = lerp(PATH_NEAR.y, PATH_FAR.y, at);
    const half = lerp(PATH_NEAR.half, PATH_FAR.half, Math.pow(at, 0.82));
    const step = tones[index % 2] ?? [];

    stroke(
      brush,
      { x, y, length: half * 2, width: lerp(30, 7, at), angle: 0 },
      step[Math.floor(random() * step.length)] ?? SCENE.stoneDark,
      0.62 + random() * 0.2,
    );

    // A few stones on each tread, and fewer of them the further off it is: the
    // texture of a surface going away has to thin out with the surface.
    for (let mark = 0; mark < Math.round(lerp(7, 1, at)); mark += 1) {
      const lit = tones[1] ?? [];

      stroke(
        brush,
        {
          x: x + (random() - 0.5) * half * 1.7,
          y: y + (random() - 0.5) * lerp(22, 5, at),
          length: lerp(38, 8, at) * (0.5 + random()),
          width: lerp(11, 3, at),
          angle: (random() - 0.5) * 0.5,
        },
        lit[Math.floor(random() * lit.length)] ?? SCENE.stone,
        0.2 + random() * 0.3,
      );
    }
  }
};

/**
 * The stones along the rim of the water.
 *
 * @param brush - What is being drawn through
 */
const paintStones = (brush: SceneBrush): void => {
  const random = seeded(3303);
  const tones = spreadOf(PATH_STONE, {
    towards: AIR.bottom,
    haze: 0.02,
    contrast: 0.9,
    jitter: 0.1,
  });
  const { x, y } = LANDMARKS.pond;

  for (let index = 0; index < 26; index += 1) {
    const along = (random() - 0.5) * 1560;
    // Sitting on the rim of the water rather than near it: the rim is an
    // ellipse, so where a stone belongs down the picture follows from where it
    // stands across it.
    const edge = Math.sqrt(Math.max(0, 1 - Math.pow(along / 780, 2)));
    const step = tones[random() > 0.62 ? 1 : 0] ?? [];

    stroke(
      brush,
      {
        x: x + along,
        y: y - edge * 128 + (random() - 0.5) * 26,
        length: 34 + random() * 74,
        width: 14 + random() * 26,
        angle: (random() - 0.5) * 0.4,
      },
      step[Math.floor(random() * step.length)] ?? SCENE.stoneDark,
      0.55 + random() * 0.35,
    );
  }
};

/**
 * The ground the near planes stand on: the bank, and the path that goes away.
 *
 * Painted before the water, so that where the path runs down to the rim it goes
 * under it rather than across it.
 *
 * @param brush - What is being drawn through
 * @param frame - The part of the world being shown
 *
 * @example
 * paintGround(brush, frame);
 */
export const paintGround = (brush: SceneBrush, frame: Rect): void => {
  if (inFrame(frame, { x: WORLD.width / 2, y: 1170, across: WORLD.width / 2, down: 90 })) {
    paintBank(brush);
  }

  if (
    inFrame(frame, {
      x: (PATH_NEAR.x + PATH_FAR.x) / 2,
      y: (PATH_NEAR.y + PATH_FAR.y) / 2,
      across: Math.abs(PATH_FAR.x - PATH_NEAR.x) / 2 + PATH_NEAR.half,
      down: (PATH_NEAR.y - PATH_FAR.y) / 2 + 40,
    })
  ) {
    paintPath(brush);
  }
};

/**
 * The stones on the rim of the water, which sit on it rather than under it.
 *
 * @param brush - What is being drawn through
 * @param frame - The part of the world being shown
 *
 * @example
 * paintShore(brush, frame);
 */
export const paintShore = (brush: SceneBrush, frame: Rect): void => {
  if (inFrame(frame, { x: LANDMARKS.pond.x, y: LANDMARKS.pond.y - 60, across: 840, down: 120 })) {
    paintStones(brush);
  }
};
