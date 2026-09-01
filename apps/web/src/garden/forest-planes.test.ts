import { describe, expect, it } from 'vitest';

import { spreadOf } from './colour-spread';
import { PLANES } from './forest-planes';

/**
 * What holds the depth to something an assertion can read.
 *
 * A picture is not testable and this file does not pretend otherwise. What is
 * testable is the claim the picture is built on: that along the row of planes
 * four things move together and none of them wanders — that no plane is lighter
 * than the one behind it, drawn with a bigger brush than the one in front,
 * thicker than its neighbour or standing under more air than the plane further
 * off. Every one of those was a number somebody typed, and the way a ramp stops
 * being a ramp is one number edited on its own.
 */

/** How much light a colour sends out, as WCAG counts it. */
const lightness = (hex: string): number => {
  const straightened = (channel: number): number => {
    const share = channel / 255;

    return share <= 0.03928 ? share / 12.92 : Math.pow((share + 0.055) / 1.055, 2.4);
  };
  const [red, green, blue] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));

  return (
    0.2126 * straightened(red ?? 0) +
    0.7152 * straightened(green ?? 0) +
    0.0722 * straightened(blue ?? 0)
  );
};

/** The average light a plane's leaves send out, as they are actually painted. */
const litness = (plane: (typeof PLANES)[number]): number => {
  const tones = spreadOf(plane.ramp, {
    towards: plane.air,
    haze: plane.haze,
    contrast: plane.contrast,
    jitter: plane.jitter,
  }).flat();

  return tones.reduce((sum, tone) => sum + lightness(tone), 0) / tones.length;
};

/** How much of its own area a plane's crown is covered by strokes. */
const density = (plane: (typeof PLANES)[number]): number => {
  const covered = plane.trees.reduce(
    (sum, tree) =>
      sum + (tree.count * plane.size * plane.size * 0.62) / (Math.PI * tree.across * tree.down),
    0,
  );

  return covered / plane.trees.length;
};

/** Each plane beside the one in front of it, furthest first. */
const STEPS = PLANES.flatMap((plane, index) => {
  const nearer = PLANES[index + 1];

  return nearer === undefined ? [] : [{ further: plane, nearer }];
});

describe('the planes the forest is built as', () => {
  it('is five here and a sixth in front of them, which is what three could not be', () => {
    // The sixth is the near canopy and the tree that frames the right of the
    // picture (`paintForeground`), which is not a step of this table because it
    // is the frame rather than a distance. The number is asserted rather than
    // left implicit because every ramp below is a ramp over exactly this row.
    expect(PLANES).toHaveLength(5);
    expect(PLANES.map((plane) => plane.name)).toEqual(['ridge', 'far', 'grove', 'bank', 'thicket']);
  });

  it('goes darker the nearer it gets, all the way along', () => {
    for (const step of STEPS) {
      expect(litness(step.nearer), `${step.nearer.name} against ${step.further.name}`).toBeLessThan(
        litness(step.further),
      );
    }
  });

  it('is painted with a bigger brush the nearer it gets', () => {
    for (const step of STEPS) {
      expect(step.nearer.size, step.nearer.name).toBeGreaterThan(step.further.size);
    }
  });

  it('is thicker the nearer it gets', () => {
    for (const step of STEPS) {
      expect(density(step.nearer), step.nearer.name).toBeGreaterThan(density(step.further));
    }
  });

  it('keeps more of its own contrast the nearer it gets', () => {
    for (const step of STEPS) {
      expect(step.nearer.contrast, step.nearer.name).toBeGreaterThan(step.further.contrast);
    }
  });

  it('lays less air over itself the nearer it gets, and none at all at the front', () => {
    for (const step of STEPS) {
      expect(step.nearer.veil, step.nearer.name).toBeLessThan(step.further.veil);
    }

    // The plane at the reader's shoulder has nothing between it and them.
    expect(PLANES.at(-1)?.veil).toBe(0);
  });

  it('stands on the ground rather than hanging in the air', () => {
    for (const plane of PLANES) {
      // Two or three trees to a plane, which is what makes it a plane rather
      // than a cloud of leaves at one height.
      expect(plane.trees.length, plane.name).toBeGreaterThanOrEqual(2);

      for (const tree of plane.trees) {
        // A trunk that climbs, and a crown above where it stopped climbing.
        expect(tree.top, `${plane.name} at ${tree.x}`).toBeLessThan(tree.base);
        expect(tree.rise, `${plane.name} at ${tree.x}`).toBeGreaterThan(0);
        // Sky comes through every crown: a solid mass has no depth in it,
        // however many planes are laid into it.
        expect(tree.gaps, `${plane.name} at ${tree.x}`).toBeGreaterThan(0);
      }
    }
  });

  it('stands lower down the picture the nearer it gets', () => {
    const ground = (plane: (typeof PLANES)[number]): number =>
      plane.trees.reduce((sum, tree) => sum + tree.base, 0) / plane.trees.length;

    for (const step of STEPS) {
      expect(ground(step.nearer), step.nearer.name).toBeGreaterThan(ground(step.further));
    }
  });

  it('has boughs that cross it, and they belong to trees in front of it', () => {
    const crossed = PLANES.filter((plane) => (plane.crossings ?? []).length > 0);

    // A vertical passing in front of two or three layers sews the depth
    // together harder than the layers do on their own.
    expect(crossed.length).toBeGreaterThanOrEqual(2);

    for (const plane of crossed) {
      for (const crossing of plane.crossings ?? []) {
        // It leaves a tree standing nearer than this plane, so it is longer
        // than anything on this plane could reach.
        expect(crossing.length, plane.name).toBeGreaterThan(plane.size * 4);
      }
    }
  });
});
