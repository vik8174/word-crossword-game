import { describe, expect, it } from 'vitest';

import { trunkOf } from './trunks';

/**
 * The shape of a tree, which was got wrong once and in a way nothing caught.
 *
 * A trunk's strokes run **along** it, so that `width` is how thick the tree is.
 * They used to run across it, which made `width` the height of each piece and
 * left the thickness falling out of the step — the reason the one tree in this
 * world was a hundred and ninety wide, and the reason anything thinner came out
 * as a chain of beads with the air showing between them. There are seventeen
 * thin trees in this picture now, so it is worth an assertion rather than an
 * eye.
 */

describe('trunkOf', () => {
  it('runs its strokes along the tree rather than across it', () => {
    const { boughs } = trunkOf({ x: 500, base: 1000, top: 400, width: 40, seed: 77 });

    expect(boughs.length).toBeGreaterThan(5);

    for (const bough of boughs) {
      // A tree climbing straight up is a stroke pointing straight up, which is
      // a quarter turn either way. Drawn across the trunk these would all be
      // near zero, and the trunk would be as thick as the step is long.
      expect(Math.abs(Math.abs(bough.angle) - Math.PI / 2)).toBeLessThan(0.6);
      expect(bough.width).toBeLessThanOrEqual(40);
    }
  });

  it('leaves no gap between one piece of a trunk and the next', () => {
    const { boughs } = trunkOf({ x: 500, base: 1000, top: 400, width: 12, seed: 91 });

    // A thin tree is where this went wrong: each piece has to be longer than the
    // step it covers, or the trunk arrives as a chain of beads.
    for (const [index, bough] of boughs.entries()) {
      const next = boughs[index + 1];

      if (next !== undefined) {
        expect(bough.length).toBeGreaterThan(Math.abs(next.y - bough.y));
      }
    }
  });

  it('thins as it climbs, and comes out where it says it does', () => {
    const tree = { x: 500, base: 1000, top: 400, width: 40, seed: 77 };
    const { boughs, top } = trunkOf(tree);
    const foot = boughs[0];
    const crown = boughs.at(-1);

    expect(foot).toBeDefined();
    expect(crown).toBeDefined();
    expect(crown?.width ?? 0).toBeLessThan(foot?.width ?? 0);
    // It wanders, so it does not come out over its own foot — but not far.
    expect(Math.abs(top - tree.x)).toBeLessThan(120);
  });
});
