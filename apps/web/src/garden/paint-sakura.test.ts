import { describe, expect, it } from 'vitest';

import type { SceneBrush } from './brushwork';
import { GATE } from './locations';
import { paintSakura } from './paint-sakura';
import { frameFor, openingRect, type Rect, type Viewport, WORLD } from './world';

const DESKTOP: Viewport = { width: 1440, height: 900 };
const EVERYTHING: Rect = { x: 0, y: 0, width: WORLD.width, height: WORLD.height };

/**
 * The two things about the cherry trees that are not a matter of taste.
 *
 * One of them is where they are: a tree the petals fall off has to be in the
 * window a visitor arrives in, or it is a tree in a world nobody sees and the
 * petals are back to falling out of nothing.
 *
 * The other is where they are *not*. The blossom is painted after the temple,
 * so a crown reaching across the doorway is a crown over the hall — and at the
 * magnification a game is played at the hall is the entire window, which would
 * put pink strokes over a crossword. It is geometry and it is checked here
 * rather than remembered.
 */

/** A brush that draws nothing and remembers where every mark landed. */
const recordingBrush = () => {
  const marks: { readonly x: number; readonly y: number }[] = [];
  const stack: { x: number; y: number }[] = [];
  let at = { x: 0, y: 0 };

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
    rotate: () => {},
    scale: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    closePath: () => {},
    rect: () => {},
    roundRect: (x: number, y: number, width: number, height: number) => {
      // Every corner of it, because a stroke is laid down about its middle and
      // it is the corners that reach.
      for (const corner of [
        { x, y },
        { x: x + width, y },
        { x, y: y + height },
        { x: x + width, y: y + height },
      ]) {
        marks.push({ x: at.x + corner.x, y: at.y + corner.y });
      }
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

  return { brush, marks };
};

describe('paintSakura', () => {
  it('puts a cherry in the window a visitor arrives in', () => {
    const { brush, marks } = recordingBrush();

    paintSakura(brush, frameFor(GATE, DESKTOP));

    // Not "somewhere in the world": in the frame the gate stands in, which is
    // where the petals are most seen and therefore where they have to be
    // falling from.
    expect(marks.length).toBeGreaterThan(200);
  });

  it("never reaches across the temple's doorway", () => {
    const { brush, marks } = recordingBrush();

    paintSakura(brush, EVERYTHING);

    const doorway = openingRect();
    const inside = marks.filter(
      (mark) =>
        mark.x >= doorway.x &&
        mark.x <= doorway.x + doorway.width &&
        mark.y >= doorway.y &&
        mark.y <= doorway.y + doorway.height,
    );

    expect(inside).toEqual([]);
  });

  it('is the same two trees every load', () => {
    const first = recordingBrush();
    const second = recordingBrush();

    paintSakura(first.brush, EVERYTHING);
    paintSakura(second.brush, EVERYTHING);

    expect(second.marks).toEqual(first.marks);
  });
});
