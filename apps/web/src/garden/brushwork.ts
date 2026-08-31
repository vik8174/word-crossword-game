/**
 * What the scene is made of: one stroke, one plank, and a mass of leaves.
 *
 * The whole forest is these three calls repeated a few thousand times. It is
 * drawn rather than fetched because a picture would not survive the camera —
 * walking into the temple magnifies the doorway three and a half times, and a
 * bitmap that stood up to that would cost more than the whole of the rest of
 * this app put together.
 *
 * Every one of them takes its randomness from a seed rather than from
 * `Math.random`, so the forest is the same forest on every load and in every
 * browser. A scene that reshuffled itself on each visit would be a different
 * place each time, and the point of the exercise is that it is one place.
 */

import type { Spread } from './colour-spread';

/**
 * The part of a canvas the scene draws through, and nothing else.
 *
 * Narrowed for the same reason {@link PetalBrush} is: a browser context
 * satisfies this without being told to, and so does an object a test can read
 * back — so nothing about the drawing has to be cast, and what is drawn where
 * can be asserted rather than guessed at from a screenshot.
 */
export interface SceneBrush {
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  scale(x: number, y: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(controlX: number, controlY: number, x: number, y: number): void;
  closePath(): void;
  rect(x: number, y: number, width: number, height: number): void;
  roundRect(x: number, y: number, width: number, height: number, radii: number): void;
  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    start: number,
    end: number,
  ): void;
  clip(): void;
  fill(): void;
  stroke(): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient;
  createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
  ): CanvasGradient;
  globalAlpha: number;
  lineWidth: number;
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
}

/**
 * Numbers that are always the same numbers, from a seed.
 *
 * Mulberry32: thirty-two bits of state, no dependency, and the same sequence
 * everywhere. Which one it is matters less than that it is one.
 *
 * @param seed - Which sequence to take
 * @returns A source of numbers from 0 up to but not including 1
 *
 * @example
 * const random = seeded(4114);
 */
export const seeded = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
};

/** A number between two others. */
export const lerp = (from: number, to: number, at: number): number => from + (to - from) * at;

/** A number held inside a range. */
export const clamp = (value: number, least: number, most: number): number =>
  Math.min(most, Math.max(least, value));

/**
 * One stroke of a brush: a line with round ends, laid down at an angle.
 *
 * @param brush - What is being drawn through
 * @param mark - Where its middle is, how long and how wide it is, and which way it lies
 * @param colour - What it is drawn in
 * @param alpha - How much of it there is, 0 to 1
 */
export const stroke = (
  brush: SceneBrush,
  mark: {
    readonly x: number;
    readonly y: number;
    readonly length: number;
    readonly width: number;
    readonly angle: number;
  },
  colour: string,
  alpha: number,
): void => {
  brush.save();
  brush.globalAlpha = alpha;
  brush.translate(mark.x, mark.y);
  brush.rotate(mark.angle);
  brush.fillStyle = colour;
  brush.beginPath();
  brush.roundRect(-mark.length / 2, -mark.width / 2, mark.length, mark.width, mark.width / 2);
  brush.fill();
  brush.restore();
};

/**
 * A flat plank: what a building is made of, as against what a leaf is.
 *
 * @param brush - What is being drawn through
 * @param plank - Its middle and its size
 * @param colour - What it is drawn in
 * @param alpha - How much of it there is; all of it by default
 */
export const slab = (
  brush: SceneBrush,
  plank: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
  colour: string,
  alpha = 1,
): void => {
  brush.save();
  brush.globalAlpha = alpha;
  brush.fillStyle = colour;
  brush.fillRect(plank.x - plank.width / 2, plank.y - plank.height / 2, plank.width, plank.height);
  brush.restore();
};

/** A mass of leaves: where it is, how big, and what it is made of. */
export interface Leaves {
  /** The middle of the mass. */
  readonly x: number;
  readonly y: number;
  /** How far it reaches across and down. */
  readonly across: number;
  readonly down: number;
  /** Which forest this one is, so it is the same one every load. */
  readonly seed: number;
  /** Dark to light; a leaf is given one by how much light it would catch. */
  readonly colours: Spread;
  /** How many strokes it is made of. */
  readonly count: number;
  /** How big one leaf is. */
  readonly size: number;
  /** How solid the mass is, 0 to 1. */
  readonly alpha: number;
}

/**
 * A crown of leaves, lit from above and from the left.
 *
 * The strokes are scattered through an ellipse with the density falling towards
 * its edge, so a crown has a soft outline rather than the hard one a filled
 * shape would give it. Which colour a leaf gets is its height in the mass plus
 * a little noise, which is the whole of why the result reads as a lit thing
 * rather than as confetti.
 *
 * @param brush - What is being drawn through
 * @param leaves - The mass to draw
 *
 * @example
 * foliage(brush, { x: 900, y: 420, across: 1000, down: 380, seed: 101, colours: spreadOf(FAR_LEAF), count: 260, size: 78, alpha: 0.85 });
 */
export const foliage = (brush: SceneBrush, leaves: Leaves): void => {
  const random = seeded(leaves.seed);

  for (let index = 0; index < leaves.count; index += 1) {
    const angle = random() * Math.PI * 2;
    const distance = Math.pow(random(), 0.55);
    const x = leaves.x + Math.cos(angle) * distance * leaves.across;
    const y = leaves.y + Math.sin(angle) * distance * leaves.down;
    const lit = clamp(0.5 - (y - leaves.y) / (leaves.down * 2) + (random() - 0.5) * 0.5, 0, 0.999);
    const step = leaves.colours[Math.floor(lit * leaves.colours.length)] ?? leaves.colours[0];
    // A step with one tone in it is asked no question, which is what keeps a
    // ramp nothing has shifted drawing exactly the forest it drew before.
    const colour =
      step === undefined || step.length === 0
        ? '#000000'
        : (step[step.length === 1 ? 0 : Math.floor(random() * step.length)] ?? '#000000');

    stroke(
      brush,
      {
        x,
        y,
        length: leaves.size * (0.7 + random() * 0.9),
        width: leaves.size * (0.34 + random() * 0.4),
        angle: (random() - 0.5) * 1.7,
      },
      colour,
      leaves.alpha * (0.62 + random() * 0.38),
    );
  }
};

/** Where a trunk starts, where it stops, how thick at the bottom, and which tree it is. */
export interface Tree {
  readonly x: number;
  readonly base: number;
  readonly top: number;
  readonly width: number;
  readonly seed: number;
}

/** One length of a trunk: two ends, a thickness, and whether the light is on it. */
export interface Bough {
  readonly x: number;
  readonly y: number;
  readonly length: number;
  readonly width: number;
  readonly angle: number;
  readonly lit: boolean;
}

/** A trunk as a shape: the lengths it is made of, and where it came out at the top. */
export interface Trunk {
  readonly boughs: readonly Bough[];
  /** Where the top of it ended up across the world. */
  readonly top: number;
}

/**
 * The shape of a trunk, worked out and not yet drawn.
 *
 * It is a chain of strokes that wander sideways rather than one tapered shape,
 * because a tree that is exactly straight is a post.
 *
 * Separate from the drawing of it for one reason: where the top of a tree ends
 * up is where its crown hangs, and a crown has to hang in the same place
 * whether or not the trunk under it is inside the window. A tree culled out of
 * a frame that moved its own leaves would be a different forest at every
 * magnification.
 *
 * @param tree - The tree
 * @returns Every length of it from the ground up, and where the top came out
 *
 * @example
 * const { boughs, top } = trunkOf({ x: 2980, base: 1400, top: 120, width: 190, seed: 808 });
 */
export const trunkOf = (tree: Tree): Trunk => {
  const random = seeded(tree.seed);
  const boughs: Bough[] = [];
  let y = tree.base;
  let x = tree.x;

  while (y > tree.top) {
    const step = 46 + random() * 40;
    const nextX = x + (random() - 0.5) * 30;
    const width = tree.width * lerp(1, 0.55, (tree.base - y) / (tree.base - tree.top));

    boughs.push({
      x: (x + nextX) / 2,
      y: y - step / 2,
      length: step * 1.25,
      width,
      angle: Math.atan2(-step, nextX - x) + Math.PI / 2,
      lit: random() > 0.7,
    });

    x = nextX;
    y -= step;
  }

  return { boughs, top: x };
};

/**
 * Where the top of a tree ends up across the world.
 *
 * @param tree - The tree
 * @returns Where it came out, in world units
 */
export const topOf = (tree: Tree): number => trunkOf(tree).top;

/**
 * A trunk climbing out of the ground and thinning as it goes.
 *
 * @param brush - What is being drawn through
 * @param tree - Where it starts, where it stops, how thick at the bottom, and which tree it is
 * @param colours - The bark's two tones, lit and against the light
 * @param alpha - How much of it there is; nearly all of it by default, and less with distance
 * @returns Where the top of it ended up across the world
 */
export const trunk = (
  brush: SceneBrush,
  tree: Tree,
  colours: { readonly lit: string; readonly dark: string },
  alpha = 0.96,
): number => {
  const { boughs, top } = trunkOf(tree);

  for (const bough of boughs) {
    stroke(brush, bough, bough.lit ? colours.lit : colours.dark, alpha);
  }

  return top;
};
