import type { PlaneTree } from './forest-planes';

/**
 * Where every tree in the forest stands, plane by plane.
 *
 * Split from `forest-planes.ts` because they are two questions and only one of
 * them is ever asked twice. What a plane *is* — how far off, what it is made
 * of, how much air lies over it — is five records and the four ramps that run
 * along them, and it is read whenever anybody wonders how the depth works. Where
 * the seventeen trees stand is a table nobody reads and everybody edits, and it
 * is four times as long.
 *
 * A tree of a far plane is thin, short and shallow-crowned, and one of a near
 * plane is none of those. That is not enforced anywhere and does not need to
 * be: it falls out of the numbers below, and `forest-planes.test.ts` measures
 * the result rather than the intention.
 */

/** The far ridge, above the throat of the gate: four saplings at the top of the world. */
export const RIDGE_TREES: readonly PlaneTree[] = [
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
];

/** The plane behind the gate, where the first of the colour comes back. */
export const FAR_TREES: readonly PlaneTree[] = [
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
];

/** The middle of the wood, and the first plane whose trunks are worth seeing. */
export const GROVE_TREES: readonly PlaneTree[] = [
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
];

/** The trees on the bank the temple is built on. */
export const BANK_TREES: readonly PlaneTree[] = [
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
];

/** The two at the reader's shoulder, whose feet are below every frame. */
export const THICKET_TREES: readonly PlaneTree[] = [
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
];
