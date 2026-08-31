import { type SceneBrush, seeded, slab, stroke } from './brushwork';
import { SCENE } from './scene-palette';
import { INTERIOR } from './world';

/**
 * The hall, painted in its own coordinates.
 *
 * It is the room the crossword is played in, and every pixel of it is drawn
 * inside the temple's doorway — see {@link paintTemple}, which clips this to the
 * opening and squeezes it in. That is the arrangement the whole scene is built
 * around: the hall is not a screen the app changes to, it is a part of the
 * picture that happens to be four hundred and sixty world units wide until
 * somebody walks up to it.
 *
 * Nothing in here moves, and that is deliberate rather than unfinished. What
 * stands in front of it is a board two people are reading letters off while
 * talking to each other, so the wall behind it is the one surface in this app
 * with nothing to say (`docs/decisions/0030-where-movement-is-allowed.md`).
 */

/**
 * The closed doors the crossword stands against.
 *
 * Big enough that the board is on paper rather than on paper with a wall around
 * it: at the magnification the hall is seen at, this covers all but a margin of
 * the window. Which is the point — a board floating on a dark wall would be a
 * board on a background, and a board on lit paper is a board in a room.
 */
const SHOJI = { x: 720, y: 400, width: 1180, height: 660 } as const;

/** The paper of the doors, from where the light hits it to where it does not. */
const PAPER = ['#E4D8B6', '#D6C9A3', '#C3B48D'] as const;

/** The wood of the lattice, and of the frame around it. */
const LATTICE_WOOD = '#4C3A2B';

/** Squares across and down: two leaves of eight by four, meeting in the middle. */
const LATTICE = { across: 8, down: 4 } as const;

/** The floorboards, lit at the front and dark at the back. */
const FLOOR = ['#4A4130', '#2A2620'] as const;

/** The grain of a floorboard, lit and unlit. */
const GRAIN = ['#6A5B3C', '#3A3428'] as const;

/**
 * The garden as it stands behind closed paper: shapes with the colour taken
 * out.
 *
 * @param brush - What is being drawn through
 */
const paintGardenBehindPaper = (brush: SceneBrush): void => {
  const shadow = ['#8C8A72', '#7E8168'];

  for (const mass of [
    { x: SHOJI.x - 280, y: SHOJI.y + 120, across: 300, down: 170, seed: 771, count: 100 },
    { x: SHOJI.x + 300, y: SHOJI.y + 80, across: 260, down: 160, seed: 913, count: 90 },
  ]) {
    const random = seeded(mass.seed);

    for (let index = 0; index < mass.count; index += 1) {
      const angle = random() * Math.PI * 2;
      const distance = Math.pow(random(), 0.55);

      stroke(
        brush,
        {
          x: mass.x + Math.cos(angle) * distance * mass.across,
          y: mass.y + Math.sin(angle) * distance * mass.down,
          length: 54 * (0.7 + random() * 0.9),
          width: 54 * (0.34 + random() * 0.4),
          angle: (random() - 0.5) * 1.7,
        },
        random() > 0.5 ? shadow[0]! : shadow[1]!,
        0.13,
      );
    }
  }
};

/**
 * The doors themselves: lit paper, the garden behind it, and the lattice over
 * it.
 *
 * @param brush - What is being drawn through
 */
const paintShoji = (brush: SceneBrush): void => {
  const left = SHOJI.x - SHOJI.width / 2;
  const top = SHOJI.y - SHOJI.height / 2;

  brush.save();
  brush.beginPath();
  brush.rect(left, top, SHOJI.width, SHOJI.height);
  brush.clip();

  const paper = brush.createLinearGradient(left, top, left, top + SHOJI.height);
  paper.addColorStop(0, PAPER[0]);
  paper.addColorStop(0.55, PAPER[1]);
  paper.addColorStop(1, PAPER[2]);
  brush.fillStyle = paper;
  brush.fillRect(left, top, SHOJI.width, SHOJI.height);

  paintGardenBehindPaper(brush);

  for (let index = 1; index < LATTICE.across; index += 1) {
    slab(
      brush,
      {
        x: left + (SHOJI.width * index) / LATTICE.across,
        y: SHOJI.y,
        width: 7,
        height: SHOJI.height,
      },
      LATTICE_WOOD,
      0.75,
    );
  }

  for (let index = 1; index < LATTICE.down; index += 1) {
    slab(
      brush,
      { x: SHOJI.x, y: top + (SHOJI.height * index) / LATTICE.down, width: SHOJI.width, height: 7 },
      LATTICE_WOOD,
      0.75,
    );
  }

  // The joint down the middle, and the frame of each leaf: this is a pair of
  // doors that are shut, not one sheet of paper.
  slab(brush, { x: SHOJI.x, y: SHOJI.y, width: 16, height: SHOJI.height }, LATTICE_WOOD, 0.95);
  slab(brush, { x: left + 12, y: SHOJI.y, width: 24, height: SHOJI.height }, LATTICE_WOOD, 0.95);
  slab(
    brush,
    { x: left + SHOJI.width - 12, y: SHOJI.y, width: 24, height: SHOJI.height },
    LATTICE_WOOD,
    0.95,
  );
  slab(brush, { x: SHOJI.x, y: top + 12, width: SHOJI.width, height: 24 }, LATTICE_WOOD, 0.95);
  slab(
    brush,
    { x: SHOJI.x, y: top + SHOJI.height - 12, width: SHOJI.width, height: 24 },
    LATTICE_WOOD,
    0.95,
  );

  brush.restore();
};

/**
 * The wall the doors are set into, and the floor in front of them.
 *
 * @param brush - What is being drawn through
 */
const paintWallAndFloor = (brush: SceneBrush): void => {
  const left = SHOJI.x - SHOJI.width / 2;
  const right = SHOJI.x + SHOJI.width / 2;
  const top = SHOJI.y - SHOJI.height / 2;
  const bottom = SHOJI.y + SHOJI.height / 2;
  const random = seeded(3355);

  brush.save();
  brush.globalAlpha = 1;
  brush.fillStyle = SCENE.bark;
  brush.fillRect(0, 0, INTERIOR.width, top);
  brush.fillRect(0, top, left, SHOJI.height);
  brush.fillRect(right, top, INTERIOR.width - right, SHOJI.height);
  brush.restore();

  for (let index = 0; index < 90; index += 1) {
    const x = random() * INTERIOR.width;
    const y = random() * bottom;

    if (x > left && x < right && y > top && y < bottom) {
      continue;
    }

    stroke(
      brush,
      { x, y, length: 60 + random() * 120, width: 10 + random() * 16, angle: 0 },
      random() > 0.6 ? SCENE.vermilionDeep : SCENE.barkDeep,
      0.2 + random() * 0.3,
    );
  }

  const floor = brush.createLinearGradient(0, bottom, 0, INTERIOR.height);
  floor.addColorStop(0, FLOOR[0]);
  floor.addColorStop(1, FLOOR[1]);
  brush.save();
  brush.globalAlpha = 1;
  brush.fillStyle = floor;
  brush.fillRect(0, bottom, INTERIOR.width, INTERIOR.height - bottom);

  // What the paper is lit from behind by, landing on the boards in front of it.
  const pool = brush.createRadialGradient(SHOJI.x, bottom + 40, 20, SHOJI.x, bottom + 40, 700);
  pool.addColorStop(0, 'rgba(220, 233, 160, 0.42)');
  pool.addColorStop(1, 'rgba(220, 233, 160, 0)');
  brush.fillStyle = pool;
  brush.fillRect(0, bottom - 40, INTERIOR.width, INTERIOR.height - bottom + 40);
  brush.restore();

  for (let index = 0; index < 60; index += 1) {
    stroke(
      brush,
      {
        x: random() * INTERIOR.width,
        y: bottom + random() * (INTERIOR.height - bottom),
        length: 90 + random() * 200,
        width: 8 + random() * 14,
        angle: 0,
      },
      random() > 0.5 ? GRAIN[0] : GRAIN[1],
      0.25 + random() * 0.3,
    );
  }
};

/**
 * The two posts and the beam nearest the reader, in the temple's own red.
 *
 * They are what makes the hall a room rather than a photograph of a wall: the
 * frame of the doorway is behind the reader, so the near woodwork is the only
 * thing in the picture on this side of the board.
 *
 * @param brush - What is being drawn through
 */
const paintNearFrame = (brush: SceneBrush): void => {
  slab(
    brush,
    { x: INTERIOR.width / 2, y: 40, width: INTERIOR.width, height: 96 },
    SCENE.vermilionDeep,
  );
  slab(
    brush,
    { x: INTERIOR.width / 2, y: 76, width: INTERIOR.width, height: 18 },
    SCENE.vermilion,
    0.8,
  );

  for (const x of [96, INTERIOR.width - 96]) {
    slab(
      brush,
      { x, y: INTERIOR.height / 2, width: 66, height: INTERIOR.height },
      SCENE.vermilionDeep,
    );
    slab(
      brush,
      { x: x - 18, y: INTERIOR.height / 2, width: 20, height: INTERIOR.height },
      SCENE.vermilion,
      0.85,
    );
  }
};

/**
 * The whole hall, in its own 1440 × 900.
 *
 * @param brush - What is being drawn through, already scaled to the doorway
 *
 * @example
 * paintHall(brush); // inside a clip and a scale set by paintTemple
 */
export const paintHall = (brush: SceneBrush): void => {
  brush.save();
  brush.globalAlpha = 1;
  brush.fillStyle = SCENE.barkDeep;
  brush.fillRect(0, 0, INTERIOR.width, INTERIOR.height);
  brush.restore();

  paintShoji(brush);
  paintWallAndFloor(brush);
  paintNearFrame(brush);
};
