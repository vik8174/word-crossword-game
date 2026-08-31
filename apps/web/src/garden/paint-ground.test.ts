import { describe, expect, it } from 'vitest';

import type { SceneBrush } from './brushwork';
import { paintGround, paintShore } from './paint-ground';
import { LANDMARKS, type Rect, WORLD } from './world';

/**
 * The one thing the ground has to do, and one thing it must not.
 *
 * A path is read as going away because it narrows towards a point and its
 * stones thin out with it — nothing about it is projected and nothing is
 * foreshortened by arithmetic, so the whole of the perspective is that one ramp
 * and it is the only part of this file worth holding to anything. If the near
 * end ever stops being wider than the far end the picture keeps drawing, and
 * the eye simply stops being told how far away the far end is.
 *
 * The thing it must not do is reach the temple's doorway, for the same reason
 * the cherry trees must not: the ground is painted after the planes and before
 * the temple, and a stone across the doorway would be a stone in the hall.
 */

/** A brush that draws nothing and remembers every mark, in world units. */
const recordingBrush = () => {
  const marks: {
    readonly call: string;
    readonly args: readonly number[];
    readonly x: number;
    readonly y: number;
  }[] = [];
  const stack: { x: number; y: number }[] = [];
  let at = { x: 0, y: 0 };

  const record =
    (call: string) =>
    (...args: number[]) => {
      marks.push({ call, args, x: at.x, y: at.y });
    };

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
    rotate: record('rotate'),
    scale: record('scale'),
    beginPath: record('beginPath'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    quadraticCurveTo: record('quadraticCurveTo'),
    closePath: record('closePath'),
    rect: record('rect'),
    roundRect: record('roundRect'),
    ellipse: record('ellipse'),
    clip: record('clip'),
    fill: record('fill'),
    stroke: record('stroke'),
    fillRect: record('fillRect'),
    createLinearGradient: () => ({ addColorStop: () => {} }) as unknown as CanvasGradient,
    createRadialGradient: () => ({ addColorStop: () => {} }) as unknown as CanvasGradient,
    globalAlpha: 1,
    lineWidth: 1,
    fillStyle: '',
    strokeStyle: '',
  } satisfies SceneBrush;

  return { brush, marks };
};

const EVERYTHING: Rect = { x: 0, y: 0, width: WORLD.width, height: WORLD.height };

/** Every stroke of a painting, as a middle and a length. */
const strokes = (marks: ReturnType<typeof recordingBrush>['marks']) =>
  marks
    .filter((mark) => mark.call === 'roundRect')
    .map((mark) => ({ x: mark.x, y: mark.y, length: mark.args[2] ?? 0 }));

describe('paintGround', () => {
  it('lays a path that narrows as it goes away', () => {
    const { brush, marks } = recordingBrush();

    paintGround(brush, EVERYTHING);

    const laid = strokes(marks);
    const near = laid.filter((mark) => mark.y > 1330);
    const far = laid.filter((mark) => mark.y < 1180 && mark.y > 1100 && mark.x < 1200);

    expect(near.length).toBeGreaterThan(0);
    expect(far.length).toBeGreaterThan(0);

    // The widest tread near the reader against the widest one at the far end.
    // A surface that narrows towards a point is read as going away whatever
    // else is in the picture, and this is the whole of the perspective here.
    expect(Math.max(...near.map((mark) => mark.length))).toBeGreaterThan(
      Math.max(...far.map((mark) => mark.length)) * 2,
    );
  });

  it('never reaches the temple, which is built on the far end of it', () => {
    const { brush, marks } = recordingBrush();

    paintGround(brush, EVERYTHING);
    paintShore(brush, EVERYTHING);

    // The path goes to the gate and the bank stops short of the platform. A
    // stone up among the steps would be a stone on the temple, because the
    // ground is painted before the building rather than after it.
    const onTheTemple = strokes(marks).filter(
      (mark) => mark.y < 1040 && Math.abs(mark.x - LANDMARKS.temple.x) < 500,
    );

    expect(onTheTemple).toEqual([]);
  });

  it('costs nothing when the window is showing the sky', () => {
    const { brush, marks } = recordingBrush();

    paintGround(brush, { x: 1200, y: 100, width: 400, height: 300 });
    paintShore(brush, { x: 1200, y: 100, width: 400, height: 300 });

    expect(marks).toEqual([]);
  });

  it('is the same ground every time', () => {
    const first = recordingBrush();
    const second = recordingBrush();

    paintGround(first.brush, EVERYTHING);
    paintShore(first.brush, EVERYTHING);
    paintGround(second.brush, EVERYTHING);
    paintShore(second.brush, EVERYTHING);

    expect(second.marks).toEqual(first.marks);
  });
});

describe('paintShore', () => {
  it('sits its stones on the rim of the water rather than near it', () => {
    const { brush, marks } = recordingBrush();

    paintShore(brush, EVERYTHING);

    const stones = strokes(marks);

    expect(stones.length).toBeGreaterThan(10);

    // The rim is an ellipse, so a stone further out across the water sits lower
    // down the picture. The two ends of the shore are therefore below its
    // middle, which is what stops the stones reading as a straight line.
    const middle = stones.filter((stone) => Math.abs(stone.x - LANDMARKS.pond.x) < 200);
    const ends = stones.filter((stone) => Math.abs(stone.x - LANDMARKS.pond.x) > 650);

    expect(middle.length).toBeGreaterThan(0);
    expect(ends.length).toBeGreaterThan(0);
    expect(Math.min(...middle.map((stone) => stone.y))).toBeLessThan(
      Math.min(...ends.map((stone) => stone.y)),
    );
  });
});
