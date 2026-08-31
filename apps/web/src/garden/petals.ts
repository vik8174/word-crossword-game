/**
 * The petals: how many of them a sky holds, where they start, and how they move.
 *
 * All of it is arithmetic over plain values, with no canvas anywhere in the
 * file, because this is the half of the garden that can be held to anything.
 * What a browser then does with the numbers is {@link paintPetals}'s, and it is
 * the half no assertion can read.
 *
 * The one rule the shape of this module comes from is that a petal is never
 * moved in place. A frame is the whole sky worked out again from the last one,
 * so a dropped frame or a tab that was asleep for a minute is the same
 * arithmetic with a different number of seconds in it
 * (`docs/decisions/0030-where-movement-is-allowed.md`).
 */

/** The area a petal falls through, in CSS pixels. */
export interface Sky {
  readonly width: number;
  readonly height: number;
}

/** One petal, as it stands at one moment. */
export interface Petal {
  /** Across the sky, in pixels from its left edge. */
  readonly x: number;
  /** Down the sky, in pixels from its top edge; negative is still above it. */
  readonly y: number;
  /** How fast it falls, in pixels a second. */
  readonly fall: number;
  /** How far it wanders sideways, in pixels a second at the widest. */
  readonly sway: number;
  /** Where in that wander it is, in radians. */
  readonly phase: number;
  /** How fast it turns, in radians a second, either way. */
  readonly spin: number;
  /** Which way it is facing, in radians. */
  readonly angle: number;
  /** Half its length, in pixels. */
  readonly size: number;
  /** How much ink it carries, 0 to 1. */
  readonly ink: number;
}

/**
 * How many petals a calm sky holds.
 *
 * A background: enough that the page is not still, few enough that nothing in
 * the corner of the eye asks to be looked at. There used to be a second, much
 * larger number here — the sky the end of a game thickened to. A finished game
 * now stands inside the temple, where no petal is drawn at all, so the greeting
 * it was for is a cloth rather than weather
 * (`docs/decisions/0031-one-camera-and-what-it-promises.md`).
 */
const CALM_PETALS = 30;

/**
 * The sky the two numbers above were chosen against, in square pixels.
 *
 * They are counts and not a density, so without this a phone would be under a
 * blizzard and a desktop under a drizzle. The scaling is linear in area and
 * then clamped at both ends: past a point more petals stop reading as more
 * petals and only cost frames.
 */
const REFERENCE_SKY = 1440 * 900;
const THINNEST_SKY = 0.45;
const THICKEST_SKY = 1.8;

/**
 * How far above the top edge a new petal starts, as a share of the height.
 *
 * It is a band rather than a point so that petals arrive scattered instead of
 * in a line, and a narrow one so that a petal added is a petal seen within a
 * few seconds. A band as deep as the sky itself would mean half of every count
 * below is above the top edge, where it is worth nothing to anybody.
 */
const SEED_BAND = 0.15;

/** The ranges a petal is drawn from, each one inclusive of its floor. */
const FALL = { least: 22, most: 62 };
const SWAY = { least: 7, most: 26 };
const SPIN = { least: -1.1, most: 1.1 };
const SIZE = { least: 4.5, most: 10.5 };
const INK = { least: 0.14, most: 0.42 };

/** How fast a petal travels through its sideways wander, in radians a second. */
const SWAY_RATE = 0.9;

/**
 * A number from a range, taken from the source of randomness handed in.
 *
 * @param random - Where the randomness comes from, so a test can supply its own
 * @param range - The floor and the ceiling
 * @returns A number between them
 */
const between = (random: () => number, range: { least: number; most: number }): number =>
  range.least + random() * (range.most - range.least);

/**
 * How many petals this sky should be holding.
 *
 * @param sky - The area they fall through
 * @returns The number of petals wanted, scaled to the size of the sky
 *
 * @example
 * petalsWanted(sky); // the calm background, at the size of this window
 */
export const petalsWanted = (sky: Sky): number => {
  const density = Math.min(
    Math.max((sky.width * sky.height) / REFERENCE_SKY, THINNEST_SKY),
    THICKEST_SKY,
  );

  return Math.round(CALM_PETALS * density);
};

/**
 * A new petal, either somewhere in the sky or somewhere above it.
 *
 * The two starts are not a detail. A sky being filled for the first time wants
 * petals already spread through it, or the first thing a visitor sees is an
 * empty page raining from the top edge; every petal after that comes from
 * above, because one appearing in the middle of the screen is a petal nobody
 * believes.
 *
 * @param random - Where the randomness comes from
 * @param sky - The area it falls through
 * @param from - `sky` to spread it through the sky, `above` to drop it in from over the top
 * @returns The petal
 *
 * @example
 * seedPetal(Math.random, sky, 'above');
 */
export const seedPetal = (random: () => number, sky: Sky, from: 'sky' | 'above'): Petal => ({
  x: random() * sky.width,
  y:
    from === 'sky'
      ? random() * sky.height * (1 + SEED_BAND) - sky.height * SEED_BAND
      : -random() * sky.height * SEED_BAND,
  fall: between(random, FALL),
  sway: between(random, SWAY),
  phase: random() * Math.PI * 2,
  spin: between(random, SPIN),
  angle: random() * Math.PI * 2,
  size: between(random, SIZE),
  ink: between(random, INK),
});

/**
 * A petal that has wandered out of one side, brought back in at the other.
 *
 * Petals are pushed one way for as long as their wander lasts, so without this
 * the sky empties from one edge over a few minutes — slowly enough that nobody
 * developing it would ever sit still long enough to see it happen.
 *
 * @param x - Where it is across the sky
 * @param sky - The area it falls through
 * @param size - Half its length, so it crosses the edge rather than blinking at it
 * @returns Where it is after the wrap
 */
const wrapAcross = (x: number, sky: Sky, size: number): number => {
  const span = sky.width + size * 2;

  if (x < -size) {
    return x + span;
  }

  if (x > sky.width + size) {
    return x - span;
  }

  return x;
};

/**
 * One petal, a number of seconds later.
 *
 * @param petal - Where it was
 * @param seconds - How long has passed
 * @param sky - The area it falls through
 * @returns Where it is now
 */
const driftPetal = (petal: Petal, seconds: number, sky: Sky): Petal => {
  const phase = petal.phase + SWAY_RATE * seconds;

  return {
    ...petal,
    phase,
    x: wrapAcross(petal.x + Math.sin(phase) * petal.sway * seconds, sky, petal.size),
    y: petal.y + petal.fall * seconds,
    angle: petal.angle + petal.spin * seconds,
  };
};

/**
 * The whole sky, a number of seconds later.
 *
 * Petals that have fallen past the bottom edge are gone, and the sky is topped
 * back up to what is wanted. Nothing ever takes a petal off the screen: a sky
 * that should hold fewer of them simply stops replacing the ones that reach the
 * floor.
 *
 * @param petals - The sky as it stood
 * @param seconds - How long has passed
 * @param sky - The area they fall through
 * @param wanted - How many there should be, from {@link petalsWanted}
 * @param random - Where the randomness for any new ones comes from
 * @returns The sky now
 *
 * @example
 * driftPetals(petals, 1 / 60, sky, petalsWanted(sky), Math.random);
 */
export const driftPetals = (
  petals: readonly Petal[],
  seconds: number,
  sky: Sky,
  wanted: number,
  random: () => number,
): readonly Petal[] => {
  const falling = petals
    .map((petal) => driftPetal(petal, seconds, sky))
    .filter((petal) => petal.y - petal.size <= sky.height);

  const missing = Math.max(wanted - falling.length, 0);

  return [...falling, ...Array.from({ length: missing }, () => seedPetal(random, sky, 'above'))];
};

/**
 * The first sky of a tab: the calm background, already spread through itself.
 *
 * Spread rather than let in over the top edge, which is the one reason this is
 * not `driftPetals` with nothing to drift. A sky filled from above is an empty
 * page raining from its top edge, and then carries a bare band across the top
 * of it for the twenty seconds the first petals take to fall clear. That this
 * is not a petal appearing out of nothing in front of somebody is down to when
 * it happens: a page that has not been drawn yet.
 *
 * @param sky - The area they fall through
 * @param random - Where the randomness comes from
 * @returns A calm sky's worth of petals
 *
 * @example
 * petals.current = fillSky(sky, Math.random);
 */
export const fillSky = (sky: Sky, random: () => number): readonly Petal[] =>
  Array.from({ length: petalsWanted(sky) }, () => seedPetal(random, sky, 'sky'));
