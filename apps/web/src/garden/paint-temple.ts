import { type SceneBrush, seeded, slab, stroke } from './brushwork';
import { paintHall } from './paint-hall';
import { SCENE } from './scene-palette';
import { inFrame, INTERIOR, LANDMARKS, openingRect, type Rect } from './world';

/**
 * The temple: a vermilion body, a grey roof, and the hall behind its open
 * front.
 *
 * The doorway is the one thing in this file worth reading twice. What is inside
 * it is not a picture of a hall and not a second screen — it is
 * {@link paintHall}, drawn in its own coordinates and squeezed into the
 * opening, so the same brushwork serves a doorway two hundred pixels wide and a
 * room somebody is sitting in. That is what makes walking in a camera moving
 * rather than an app changing pages.
 */

/** How far the body of the building reaches either side of its middle. */
const BODY_HALF = 430;

/** How far the eaves reach: the roof is the shape the building is known by. */
const ROOF_HALF = 620;

/**
 * The steps up to the platform, widening as they come towards the reader.
 *
 * @param brush - What is being drawn through
 */
const paintSteps = (brush: SceneBrush): void => {
  const random = seeded(9021);
  const rows = 9;
  const top = LANDMARKS.temple.y + 40;
  const bottom = LANDMARKS.temple.y + 250;

  for (let index = 0; index < rows; index += 1) {
    const at = index / (rows - 1);
    const y = top + (bottom - top) * at;
    const half = 300 + (470 - 300) * at;

    stroke(
      brush,
      { x: LANDMARKS.temple.x, y, length: half * 2, width: 26, angle: 0 },
      index % 2 === 0 ? SCENE.stoneDark : SCENE.stone,
      0.95,
    );

    for (let mark = 0; mark < 8; mark += 1) {
      stroke(
        brush,
        {
          x: LANDMARKS.temple.x + (random() - 0.5) * half * 1.8,
          y: y + (random() - 0.5) * 16,
          length: 40 + random() * 70,
          width: 8 + random() * 10,
          angle: 0,
        },
        random() > 0.5 ? SCENE.stone : SCENE.cream,
        0.16 + random() * 0.2,
      );
    }
  }
};

/**
 * The body of the building and the platform it stands on.
 *
 * @param brush - What is being drawn through
 */
const paintBody = (brush: SceneBrush): void => {
  const { x, y } = LANDMARKS.temple;

  slab(brush, { x, y: y - 210, width: BODY_HALF * 2, height: 420 }, SCENE.vermilionDeep);

  // Brushwork over the fill, so the red is a painted surface rather than a
  // rectangle somebody filled in.
  const random = seeded(6161);

  for (let index = 0; index < 110; index += 1) {
    stroke(
      brush,
      {
        x: x + (random() - 0.5) * BODY_HALF * 2,
        y: y - 210 + (random() - 0.5) * 420,
        length: 50 + random() * 120,
        width: 9 + random() * 16,
        angle: 0,
      },
      random() > 0.55 ? SCENE.vermilion : SCENE.vermilionDeep,
      0.3 + random() * 0.4,
    );
  }

  slab(brush, { x, y: y + 16, width: BODY_HALF * 2 + 110, height: 44 }, SCENE.vermilionDeep);
  slab(brush, { x, y: y - 4, width: BODY_HALF * 2 + 110, height: 12 }, SCENE.vermilionLit, 0.7);

  for (let post = -4; post <= 4; post += 1) {
    if (Math.abs(post) < 2) {
      continue;
    }

    slab(brush, { x: x + post * 96, y: y - 40, width: 12, height: 74 }, SCENE.vermilion);
  }

  for (const side of [-1, 1]) {
    slab(brush, { x: x + side * 290, y: y - 74, width: 300, height: 12 }, SCENE.vermilion);
  }
};

/**
 * The hall, drawn inside the doorway and clipped to it.
 *
 * @param brush - What is being drawn through
 */
const paintOpening = (brush: SceneBrush): void => {
  const opening = openingRect();

  brush.save();
  brush.beginPath();
  brush.rect(opening.x, opening.y, opening.width, opening.height);
  brush.clip();
  brush.translate(opening.x, opening.y);
  brush.scale(opening.width / INTERIOR.width, opening.height / INTERIOR.height);
  paintHall(brush);
  brush.restore();

  brush.save();
  brush.globalAlpha = 1;
  brush.strokeStyle = SCENE.vermilion;
  brush.lineWidth = 22;
  brush.beginPath();
  brush.rect(opening.x, opening.y, opening.width, opening.height);
  brush.stroke();
  brush.strokeStyle = SCENE.vermilionLit;
  brush.lineWidth = 6;
  brush.beginPath();
  brush.rect(opening.x - 11, opening.y - 11, opening.width + 22, opening.height + 22);
  brush.stroke();
  brush.restore();

  // Shuttered panels either side of the way in, so the open front reads as one
  // door standing open rather than as a hole in a wall.
  for (const side of [-1, 1]) {
    const x = LANDMARKS.temple.x + side * 320;
    const y = opening.y + opening.height / 2;

    slab(brush, { x, y, width: 170, height: opening.height - 20 }, '#C4BBA0');
    slab(brush, { x, y, width: 148, height: opening.height - 44 }, SCENE.cream, 0.6);
    slab(brush, { x, y, width: 170, height: 10 }, SCENE.vermilionDeep, 0.8);
  }

  for (const side of [-1, 1]) {
    slab(
      brush,
      {
        x: LANDMARKS.temple.x + side * (BODY_HALF - 22),
        y: LANDMARKS.temple.y - 210,
        width: 30,
        height: 420,
      },
      SCENE.vermilion,
    );
  }
};

/**
 * The roof, and the finial that says which building this is.
 *
 * @param brush - What is being drawn through
 */
const paintRoof = (brush: SceneBrush): void => {
  const { x } = LANDMARKS.temple;
  const y = LANDMARKS.temple.y - 420;

  brush.save();
  brush.globalAlpha = 1;
  brush.beginPath();
  brush.moveTo(x - ROOF_HALF, y + 40);
  brush.quadraticCurveTo(x - ROOF_HALF * 0.55, y - 96, x, y - 120);
  brush.quadraticCurveTo(x + ROOF_HALF * 0.55, y - 96, x + ROOF_HALF, y + 40);
  brush.quadraticCurveTo(x + ROOF_HALF * 0.5, y + 4, x, y - 4);
  brush.quadraticCurveTo(x - ROOF_HALF * 0.5, y + 4, x - ROOF_HALF, y + 40);
  brush.closePath();
  brush.fillStyle = SCENE.roof;
  brush.fill();
  brush.clip();

  const random = seeded(2288);

  for (let index = 0; index < 110; index += 1) {
    stroke(
      brush,
      {
        x: x + (random() - 0.5) * ROOF_HALF * 2,
        y: y - 120 + random() * 170,
        length: 70 + random() * 150,
        width: 10 + random() * 16,
        angle: (random() - 0.5) * 0.45,
      },
      random() > 0.62 ? SCENE.roofLit : random() > 0.3 ? SCENE.stone : SCENE.stoneDark,
      0.3 + random() * 0.45,
    );
  }

  brush.restore();

  brush.save();
  brush.globalAlpha = 0.5;
  brush.beginPath();
  brush.moveTo(x - ROOF_HALF, y + 40);
  brush.quadraticCurveTo(x, y - 4, x + ROOF_HALF, y + 40);
  brush.lineWidth = 12;
  brush.strokeStyle = SCENE.barkDeep;
  brush.stroke();
  brush.restore();

  slab(brush, { x, y: y - 168, width: 14, height: 110 }, SCENE.roofLit, 0.9);
  slab(brush, { x, y: y - 214, width: 46, height: 12 }, SCENE.roofLit, 0.9);
};

/**
 * How far the building reaches from the middle of its platform, in world units.
 *
 * Taken from the widest and the tallest of the four passes above rather than
 * guessed at: the eaves reach furthest across, the ridge of the roof furthest
 * up at five hundred and forty above the platform, and the bottom step furthest
 * down at two hundred and sixty-three below it.
 */
const TEMPLE_REACH = { across: ROOF_HALF + 40, down: 420 } as const;

/** How far above the platform the middle of the building sits. */
const TEMPLE_RISE = 140;

/**
 * The whole temple, steps first and roof last.
 *
 * @param brush - What is being drawn through, in world coordinates
 * @param frame - The part of the world being shown; a building off the edge of it is not painted
 *
 * @example
 * paintTemple(brush, frame);
 */
export const paintTemple = (brush: SceneBrush, frame: Rect): void => {
  if (
    !inFrame(frame, {
      x: LANDMARKS.temple.x,
      y: LANDMARKS.temple.y - TEMPLE_RISE,
      across: TEMPLE_REACH.across,
      down: TEMPLE_REACH.down,
    })
  ) {
    return;
  }

  paintSteps(brush);
  paintBody(brush);
  paintOpening(brush);
  paintRoof(brush);
};
