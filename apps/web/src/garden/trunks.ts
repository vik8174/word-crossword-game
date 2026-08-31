import { lerp, type SceneBrush, seeded, stroke } from './brushwork';

/**
 * A tree, as a shape and then as strokes.
 *
 * Its own file because the shape and the drawing had to come apart, and once
 * they had, this was no longer one mark among three. Where the top of a tree
 * ends up is where its crown hangs, and a crown has to hang in the same place
 * whether or not the trunk under it is inside the window — a tree culled out of
 * a frame that moved its own leaves would be a different forest at every
 * magnification. So {@link trunkOf} works the tree out, everything that needs to
 * know where the crown goes reads `top` off it, and {@link trunk} takes the
 * shape rather than the tree so that no caller walks the same tree twice.
 */

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
 * because a tree that is exactly straight is a post. Each stroke runs along the
 * trunk, so `width` is how thick the tree is and the taper is how much of that
 * is left at the top.
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
      // Laid along the trunk rather than across it, so that `width` is how
      // thick the tree is and the length is how far up this piece of it goes.
      // A little longer than the step it covers, so consecutive pieces overlap
      // instead of leaving the trunk in beads — which is what a thin tree drawn
      // the other way round comes out as, and there are now sixteen thin trees
      // in this picture (`forest-planes.ts`).
      length: step * 1.3,
      width,
      angle: Math.atan2(-step, nextX - x),
      lit: random() > 0.7,
    });

    x = nextX;
    y -= step;
  }

  return { boughs, top: x };
};

/**
 * A trunk climbing out of the ground and thinning as it goes.
 *
 * It takes the shape rather than the tree, because every caller needs the top
 * of it before it knows whether the trunk itself is inside the window — the
 * crown hangs there either way ({@link trunkOf}) — and walking the tree twice
 * to find that out is the sort of work the frame was handed to the painting to
 * stop paying for.
 *
 * @param brush - What is being drawn through
 * @param shape - The trunk, from {@link trunkOf}
 * @param colours - The bark's two tones, lit and against the light
 * @param alpha - How much of it there is; nearly all of it by default, and less with distance
 *
 * @example
 * const shape = trunkOf(tree);
 * if (inFrame(frame, boxAround(shape))) trunk(brush, shape, BARK);
 */
export const trunk = (
  brush: SceneBrush,
  shape: Trunk,
  colours: { readonly lit: string; readonly dark: string },
  alpha = 0.96,
): void => {
  for (const bough of shape.boughs) {
    stroke(brush, bough, bough.lit ? colours.lit : colours.dark, alpha);
  }
};
