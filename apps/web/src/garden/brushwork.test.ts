import { describe, expect, it } from 'vitest';

import { foliage, type SceneBrush, seeded } from './brushwork';
import { spreadOf } from './colour-spread';
import { SCENE } from './scene-palette';

/**
 * The one thing about a mass of leaves that is arithmetic rather than taste.
 *
 * Whether a mass of strokes reads as a crown is an eye's question and is not
 * asked here. Where the sky comes through one is not.
 *
 * A crown has holes in it that the air comes through, because a wall of green
 * has no depth in it however many planes are laid into it — and a hole that
 * quietly stopped dropping strokes would leave the picture looking exactly as
 * it did before the planes were added, with nothing to point at. A dropped
 * stroke is dropped before it is measured, so the leaves after it in one crown
 * are not the leaves that would have been there without the hole; what does not
 * move is where the holes themselves are.
 */

/** A brush that draws nothing and remembers where each stroke landed. */
const recordingBrush = () => {
  const strokes: { readonly x: number; readonly y: number; readonly angle: number }[] = [];
  const stack: { x: number; y: number }[] = [];
  let at = { x: 0, y: 0 };
  let angle = 0;

  const brush = {
    save: () => {
      stack.push(at);
    },
    restore: () => {
      at = stack.pop() ?? { x: 0, y: 0 };
    },
    translate: (x: number, y: number) => {
      at = { x: at.x + x, y: at.y + y };
    },
    rotate: (turn: number) => {
      angle = turn;
    },
    scale: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    closePath: () => {},
    rect: () => {},
    roundRect: () => {
      strokes.push({ x: at.x, y: at.y, angle });
    },
    ellipse: () => {},
    clip: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }) as unknown as CanvasGradient,
    createRadialGradient: () => ({ addColorStop: () => {} }) as unknown as CanvasGradient,
    globalAlpha: 1,
    lineWidth: 1,
    fillStyle: '',
    strokeStyle: '',
  } satisfies SceneBrush;

  return { brush, strokes };
};

const MASS = {
  x: 1000,
  y: 500,
  across: 300,
  down: 150,
  seed: 4242,
  colours: spreadOf([SCENE.deep, SCENE.shade, SCENE.moss]),
  count: 600,
  size: 40,
  alpha: 1,
} as const;

/** Where the holes of a mass are, worked out the same way {@link foliage} works them out. */
const gapsOf = (mass: typeof MASS, wanted: number) => {
  const random = seeded(mass.seed + 1);

  return Array.from({ length: wanted }, () => {
    const angle = random() * Math.PI * 2;
    const distance = 0.15 + random() * 0.5;

    return {
      x: mass.x + Math.cos(angle) * distance * mass.across,
      y: mass.y + Math.sin(angle) * distance * mass.down,
      across: mass.across * (0.1 + random() * 0.13),
      down: mass.down * (0.12 + random() * 0.16),
    };
  });
};

describe('foliage', () => {
  it('drops the strokes that land where the sky comes through', () => {
    const solid = recordingBrush();
    const holed = recordingBrush();

    foliage(solid.brush, MASS);
    foliage(holed.brush, { ...MASS, gaps: 3 });

    expect(holed.strokes.length).toBeLessThan(solid.strokes.length);

    // Not merely fewer of them: none at all inside any of the three holes.
    for (const gap of gapsOf(MASS, 3)) {
      const inside = holed.strokes.filter(
        (mark) =>
          Math.pow((mark.x - gap.x) / gap.across, 2) + Math.pow((mark.y - gap.y) / gap.down, 2) < 1,
      );

      expect(inside).toEqual([]);
    }
  });

  it('takes its holes from a stream of its own, so they do not follow the leaves', () => {
    const small = recordingBrush();
    const large = recordingBrush();

    foliage(small.brush, { ...MASS, count: 300, gaps: 3 });
    foliage(large.brush, { ...MASS, count: 900, gaps: 3 });

    // The same three holes in the same three places, in a mass of three hundred
    // strokes and in one of nine hundred. Holes drawn from the mass's own
    // stream would move whenever anybody changed how thick the crown is, and
    // the sky would come through somewhere else.
    for (const gap of gapsOf(MASS, 3)) {
      for (const painting of [small, large]) {
        const inside = painting.strokes.filter(
          (mark) =>
            Math.pow((mark.x - gap.x) / gap.across, 2) + Math.pow((mark.y - gap.y) / gap.down, 2) <
            1,
        );

        expect(inside).toEqual([]);
      }
    }

    expect(large.strokes.length).toBeGreaterThan(small.strokes.length);
  });

  it('is the same mass every time, holes and all', () => {
    const first = recordingBrush();
    const second = recordingBrush();

    foliage(first.brush, { ...MASS, gaps: 3 });
    foliage(second.brush, { ...MASS, gaps: 3 });

    expect(second.strokes).toEqual(first.strokes);
  });
});
