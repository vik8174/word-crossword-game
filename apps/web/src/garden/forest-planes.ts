import { SCENE } from './scene-palette';

/**
 * The stairs the forest is built as: six planes from the ridge behind
 * everything to the leaves at the reader's shoulder.
 *
 * The picture used to have three layers — a gradient of air, two masses of far
 * leaves at one height, and then the gate. Three layers is not a distance, it
 * is a backdrop with something in front of it, and the eye has nothing to walk
 * along. Six is enough for the walk, and along the whole row four things move
 * together at once:
 *
 * | | further | nearer |
 * |---|---|---|
 * | lightness | towards the air | towards `night` |
 * | the mark | smaller | larger |
 * | the mass | thinner | denser |
 * | inside it | flatter | full contrast |
 *
 * Three of the four are colour and live in the {@link Shift}; the fourth is the
 * size of the brush and lives on the mass. What separates the planes from each
 * other is not any of them, though — it is the {@link Plane.veil} laid over
 * each plane once it is painted, a thin sheet of the colour of the air, thicker
 * the further back it goes. Without it the four ramps read as four masses that
 * happen to differ, and with it they read as air.
 *
 * Every plane stands on the ground rather than hanging: a plane is two or three
 * trees, and its leaves are the crowns of those trees, put where the trunk
 * came out at the top and not at a place of their own. That is the second half
 * of what was missing — the world had one trunk in it, at the right-hand edge
 * of the frame, and every other mass of green was a cloud.
 *
 * The numbers are data and nothing here draws, for the same reason `world.ts`
 * does not: this half is what a test can read.
 */

/**
 * Leaves on a ridge.
 *
 * Taken from the light end of the greens rather than the dark one, and it is
 * the one thing about the ramps that looks wrong written down. The air in this
 * place is a flat colour across the width of the world, so a far mass mixed
 * *towards* it disappears into it — which is what happened when this was
 * `deep` and `shade`. What reads as distance against a flat air is a mass
 * slightly lighter than the air, seen edge-on: `moss` and `leaf` taken half the
 * way to `shade` land just above it, and the ridge comes back as a pale band.
 */
const RIDGE_LEAF = [SCENE.moss, SCENE.leaf] as const;

/** Leaves at a distance, with the first of their colour coming back. */
const DISTANT_LEAF = [SCENE.shade, SCENE.moss, SCENE.leaf] as const;

/** Leaves in the middle of the wood, where a leaf is a leaf. */
const GROVE_LEAF = [SCENE.deep, SCENE.shade, SCENE.moss, SCENE.leaf] as const;

/** Leaves on the bank, out of the light and holding their own colour. */
const BANK_LEAF = [SCENE.night, SCENE.deep, SCENE.shade, SCENE.moss] as const;

/** Leaves at the reader's shoulder, between them and what light there is. */
const THICKET_LEAF = [SCENE.barkDeep, SCENE.night, SCENE.deep, SCENE.shade, SCENE.moss] as const;

/** The bark of a tree, and what it goes to as it goes away. */
export const BARK = { lit: SCENE.bark, dark: SCENE.barkDeep } as const;

/**
 * The air of this place, top to bottom.
 *
 * One gradient, and everything that has anything to do with distance is drawn
 * from it: the sky itself, the sheet laid between one plane and the next, and
 * the colour a plane's own leaves are shifted towards. A haze that was one flat
 * colour would lift the dark bottom of the picture towards the middle of it,
 * and the dark bottom is where the water and the near bushes are.
 */
export const AIR = { top: SCENE.deep, middle: SCENE.shade, bottom: SCENE.night } as const;

/** Where down the world the middle of the air is. */
export const AIR_MIDDLE = 0.42;

/** A tree of one of the planes, with the crown that hangs on it. */
export interface PlaneTree {
  /** Where it comes out of its plane's ground. */
  readonly x: number;
  readonly base: number;
  /** Where the trunk stops climbing. */
  readonly top: number;
  /** How thick at the foot. */
  readonly width: number;
  /** Which tree this is, so it is the same one every load. */
  readonly seed: number;
  /** How far above the top of the trunk the middle of the crown sits. */
  readonly rise: number;
  /** How far the crown reaches across and down. */
  readonly across: number;
  readonly down: number;
  /** How many strokes it is made of, and how many holes the sky comes through. */
  readonly count: number;
  readonly gaps: number;
}

/**
 * A bough long enough to cross a plane, and the tree it leaves.
 *
 * One vertical passing in front of two or three layers sews the depth together
 * harder than the layers do on their own, which is why these are not drawn with
 * the tree they belong to. A bough of a near tree laid down once the far planes
 * are painted passes over all of them; its own trunk arrives later and joins it.
 */
export interface Crossing {
  /** How far up from the foot of its tree it leaves, and where its tree stands. */
  readonly x: number;
  readonly y: number;
  readonly length: number;
  readonly width: number;
  readonly angle: number;
  /** How much of the bark is still there at this distance, 0 to 1. */
  readonly bark: number;
}

/** One step of the stairs. */
export interface Plane {
  /** What it is called, which is what a test and a reader both need. */
  readonly name: string;
  /** The colours its leaves are drawn from, dark to light. */
  readonly ramp: readonly string[];
  /** The colour of the air at this plane's own height, which is what it fades towards. */
  readonly air: string;
  /** How much air lies over its own colours, how flat it has gone, and by how much a leaf may differ. */
  readonly haze: number;
  readonly contrast: number;
  readonly jitter: number;
  /** How big one leaf is on this plane. */
  readonly size: number;
  /** How solid its masses are. */
  readonly alpha: number;
  /** How thick the sheet of air laid over it is once it is painted, 0 for none. */
  readonly veil: number;
  /** How much of the bark is still there at this distance. */
  readonly bark: number;
  /** The trees, and the crowns that hang on them. */
  readonly trees: readonly PlaneTree[];
  /**
   * Boughs of nearer trees, laid down once this plane and its sheet are down.
   *
   * They belong to the trees of the planes in front and are painted here on
   * purpose: that is what makes them cross.
   */
  readonly crossings?: readonly Crossing[];
}

/**
 * The six planes, furthest first.
 *
 * They are painted in this order, and the temple stands between the fourth and
 * the fifth: the bank is the ground it is built on and the thicket is in front
 * of it, which is what stops the building from reading as a sticker on a wall
 * of green.
 */
export const PLANES: readonly Plane[] = [
  {
    name: 'ridge',
    air: SCENE.shade,
    ramp: RIDGE_LEAF,
    haze: 0.5,
    contrast: 0.26,
    jitter: 0.035,
    size: 22,
    alpha: 0.7,
    veil: 0.24,
    bark: 0.24,
    trees: [
      {
        x: 700,
        base: 690,
        top: 604,
        width: 12,
        seed: 2101,
        rise: 30,
        across: 165,
        down: 38,
        count: 30,
        gaps: 2,
      },
      {
        x: 1080,
        base: 696,
        top: 598,
        width: 13,
        seed: 2102,
        rise: 32,
        across: 178,
        down: 41,
        count: 33,
        gaps: 2,
      },
      {
        x: 1560,
        base: 688,
        top: 602,
        width: 12,
        seed: 2103,
        rise: 30,
        across: 170,
        down: 39,
        count: 31,
        gaps: 2,
      },
      {
        x: 2680,
        base: 694,
        top: 600,
        width: 13,
        seed: 2104,
        rise: 32,
        across: 174,
        down: 40,
        count: 32,
        gaps: 2,
      },
    ],
  },
  {
    name: 'far',
    air: SCENE.shade,
    ramp: DISTANT_LEAF,
    haze: 0.32,
    contrast: 0.44,
    jitter: 0.045,
    size: 32,
    alpha: 0.8,
    veil: 0.18,
    bark: 0.4,
    trees: [
      {
        x: 300,
        base: 800,
        top: 722,
        width: 20,
        seed: 2201,
        rise: 44,
        across: 215,
        down: 54,
        count: 40,
        gaps: 2,
      },
      {
        x: 1240,
        base: 806,
        top: 716,
        width: 21,
        seed: 2202,
        rise: 46,
        across: 232,
        down: 58,
        count: 44,
        gaps: 3,
      },
      {
        x: 1900,
        base: 798,
        top: 720,
        width: 20,
        seed: 2203,
        rise: 44,
        across: 220,
        down: 55,
        count: 41,
        gaps: 2,
      },
      {
        x: 2850,
        base: 804,
        top: 718,
        width: 21,
        seed: 2204,
        rise: 46,
        across: 226,
        down: 57,
        count: 43,
        gaps: 3,
      },
    ],
  },
  {
    name: 'grove',
    air: SCENE.shade,
    ramp: GROVE_LEAF,
    haze: 0.14,
    contrast: 0.6,
    jitter: 0.055,
    size: 44,
    alpha: 0.87,
    veil: 0.12,
    bark: 0.6,
    trees: [
      {
        x: 180,
        base: 936,
        top: 852,
        width: 32,
        seed: 2301,
        rise: 56,
        across: 265,
        down: 78,
        count: 58,
        gaps: 3,
      },
      {
        x: 1060,
        base: 940,
        top: 848,
        width: 33,
        seed: 2304,
        rise: 58,
        across: 276,
        down: 81,
        count: 61,
        gaps: 3,
      },
      {
        x: 1640,
        base: 942,
        top: 846,
        width: 33,
        seed: 2302,
        rise: 58,
        across: 282,
        down: 83,
        count: 62,
        gaps: 3,
      },
      {
        x: 2980,
        base: 934,
        top: 850,
        width: 32,
        seed: 2303,
        rise: 56,
        across: 270,
        down: 80,
        count: 59,
        gaps: 3,
      },
    ],
    // Two boughs off the bank trees behind, which from here pass over the
    // ridge, the far plane and the grove at once.
    crossings: [
      { x: 290, y: 900, length: 700, width: 22, angle: -0.36, bark: 0.78 },
      { x: 1770, y: 918, length: 640, width: 20, angle: 0.32, bark: 0.78 },
    ],
  },
  {
    name: 'bank',
    air: SCENE.deep,
    ramp: BANK_LEAF,
    haze: 0.05,
    contrast: 0.78,
    jitter: 0.06,
    size: 56,
    alpha: 0.92,
    veil: 0.06,
    bark: 0.8,
    trees: [
      {
        x: 250,
        base: 1092,
        top: 1010,
        width: 46,
        seed: 2401,
        rise: 66,
        across: 315,
        down: 104,
        count: 76,
        gaps: 3,
      },
      {
        x: 790,
        base: 1096,
        top: 1006,
        width: 47,
        seed: 2405,
        rise: 68,
        across: 320,
        down: 106,
        count: 78,
        gaps: 3,
      },
      {
        x: 1290,
        base: 1088,
        top: 1012,
        width: 44,
        seed: 2404,
        rise: 64,
        across: 304,
        down: 100,
        count: 73,
        gaps: 3,
      },
      {
        x: 1740,
        base: 1086,
        top: 1016,
        width: 44,
        seed: 2402,
        rise: 62,
        across: 296,
        down: 98,
        count: 71,
        gaps: 3,
      },
      {
        x: 3060,
        base: 1094,
        top: 1008,
        width: 47,
        seed: 2403,
        rise: 68,
        across: 326,
        down: 108,
        count: 79,
        gaps: 3,
      },
    ],
    // And one off a thicket tree, which from here crosses four planes.
    crossings: [{ x: 470, y: 1130, length: 600, width: 30, angle: 0.28, bark: 0.94 }],
  },
  {
    name: 'thicket',
    air: SCENE.night,
    ramp: THICKET_LEAF,
    haze: 0.015,
    contrast: 0.9,
    jitter: 0.06,
    size: 62,
    alpha: 0.95,
    veil: 0,
    bark: 0.94,
    trees: [
      {
        x: 430,
        base: 1400,
        top: 1246,
        width: 62,
        seed: 2501,
        rise: 84,
        across: 330,
        down: 142,
        count: 108,
        gaps: 3,
      },
      {
        x: 2440,
        base: 1400,
        top: 1252,
        width: 58,
        seed: 2502,
        rise: 80,
        across: 306,
        down: 134,
        count: 100,
        gaps: 3,
      },
    ],
  },
] as const;

/**
 * Where the temple stands in the order above: after the bank it is built on,
 * before the thicket in front of it.
 */
export const TEMPLE_AFTER = 'bank';
