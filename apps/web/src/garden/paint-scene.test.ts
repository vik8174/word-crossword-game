import { describe, expect, it } from 'vitest';

import type { SceneBrush } from './brushwork';
import { GATE } from './locations';
import { paintHall } from './paint-hall';
import { paintScene } from './paint-scene';
import { paintTemple } from './paint-temple';
import { frameFor, INTERIOR, openingRect, type Rect, type Viewport } from './world';

const DESKTOP: Viewport = { width: 1440, height: 900 };

/** One thing a brush was told to do, and the numbers it was told to do it with. */
interface Mark {
  readonly call: string;
  readonly args: readonly number[];
  /** Where the origin of the space it was drawn in was, and how big that space was. */
  readonly space: Space;
}

/** A transform, as far as this scene ever uses one: an origin and two scales. */
interface Space {
  readonly x: number;
  readonly y: number;
  readonly across: number;
  readonly down: number;
}

const ORIGIN: Space = { x: 0, y: 0, across: 1, down: 1 };

/**
 * A brush that draws nothing, remembers everything, and follows the transform.
 *
 * jsdom has no canvas, which is the ordinary reason a drawing goes unchecked.
 * It is not the reason it should be: where a stroke lands is arithmetic like
 * any other, and the one thing this scene has to get right — the hall being
 * painted inside the temple's doorway and not merely near it — is a question
 * about coordinates rather than about pixels.
 *
 * Only translation and scaling are followed, because they are the only two the
 * scene composes. A rotation is always applied about a point the brush has just
 * been translated to, so it moves the mark's own outline and never the place it
 * was put.
 */
const recordingBrush = () => {
  const marks: Mark[] = [];
  const gradient = { addColorStop: () => {} } as unknown as CanvasGradient;
  const stack: Space[] = [];
  let space: Space = ORIGIN;

  const record =
    (call: string) =>
    (...args: number[]) => {
      marks.push({ call, args, space });
    };

  const brush: SceneBrush = {
    save: () => {
      stack.push(space);
    },
    restore: () => {
      space = stack.pop() ?? ORIGIN;
    },
    translate: (x: number, y: number) => {
      space = { ...space, x: space.x + space.across * x, y: space.y + space.down * y };
    },
    scale: (x: number, y: number) => {
      space = { ...space, across: space.across * x, down: space.down * y };
    },
    rotate: record('rotate'),
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
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    globalAlpha: 1,
    lineWidth: 1,
    fillStyle: '',
    strokeStyle: '',
  };

  return { brush, marks };
};

/** Where a rectangle drawn in one space lands in the space it all started in. */
const landedAt = (mark: Mark): Rect => ({
  x: mark.space.x + mark.space.across * (mark.args[0] ?? 0),
  y: mark.space.y + mark.space.down * (mark.args[1] ?? 0),
  width: mark.space.across * (mark.args[2] ?? 0),
  height: mark.space.down * (mark.args[3] ?? 0),
});

describe('paintScene', () => {
  it('covers the window before it paints anything into it', () => {
    const { brush, marks } = recordingBrush();

    paintScene(brush, frameFor(GATE, DESKTOP), DESKTOP);

    // Nothing is cleared: the first thing down is opaque and covers the whole
    // window, so whatever the canvas held a moment ago is under a sky rather
    // than showing through one.
    const [first] = marks.filter((mark) => mark.call === 'fillRect');

    expect(first).toBeDefined();
    expect(landedAt(first!)).toEqual({ x: 0, y: 0, width: DESKTOP.width, height: DESKTOP.height });
  });

  it('is a painting rather than a shape', () => {
    const { brush, marks } = recordingBrush();

    paintScene(brush, frameFor(GATE, DESKTOP), DESKTOP);

    // Thousands of strokes, which is what "drawn in code, stroke by stroke"
    // amounts to and what a flat set of silhouettes would not.
    expect(marks.filter((mark) => mark.call === 'fill').length).toBeGreaterThan(2000);
  });

  it('paints the same forest every time', () => {
    const first = recordingBrush();
    const second = recordingBrush();

    paintScene(first.brush, frameFor(GATE, DESKTOP), DESKTOP);
    paintScene(second.brush, frameFor(GATE, DESKTOP), DESKTOP);

    // Every leaf comes from a seed and none of them from `Math.random`. A
    // forest that reshuffled itself between one visit and the next would be a
    // different place each time, and the whole exercise is that it is one
    // place.
    expect(second.marks).toEqual(first.marks);
  });
});

describe('paintTemple', () => {
  it('paints the hall inside the doorway and nowhere else', () => {
    const { brush, marks } = recordingBrush();

    paintTemple(brush);

    // The hall's first act is to lay its own floor over the whole of its own
    // 1440 × 900. Where that rectangle lands in the world is the whole of what
    // "the hall is painted inside the opening" means, and it lands exactly on
    // the doorway.
    const hall = marks.find(
      (mark) =>
        mark.call === 'fillRect' &&
        mark.args[2] === INTERIOR.width &&
        mark.args[3] === INTERIOR.height,
    );

    expect(hall).toBeDefined();

    const landed = landedAt(hall!);
    const opening = openingRect();

    expect(landed.x).toBeCloseTo(opening.x);
    expect(landed.y).toBeCloseTo(opening.y);
    expect(landed.width).toBeCloseTo(opening.width);
    expect(landed.height).toBeCloseTo(opening.height);
  });

  it('clips the hall to the doorway, so nothing inside can spill out of it', () => {
    const { brush, marks } = recordingBrush();

    paintTemple(brush);

    const clipped = marks.findIndex((mark) => mark.call === 'clip');
    const rectangle = marks
      .slice(0, clipped)
      .reverse()
      .find((mark) => mark.call === 'rect');

    expect(rectangle).toBeDefined();
    expect(landedAt(rectangle!)).toEqual(openingRect());
  });
});

describe('paintHall', () => {
  it('keeps every last stroke of the room inside the room', () => {
    const { brush, marks } = recordingBrush();

    paintHall(brush);

    // It is drawn in its own coordinates and squeezed into a doorway, so a
    // stroke that wandered outside them would be a stroke on the wrong side of
    // the temple wall at every magnification.
    const outside = marks
      .filter((mark) => mark.call === 'roundRect' || mark.call === 'fillRect')
      .map(landedAt)
      .filter(
        (mark) =>
          mark.x < -INTERIOR.width ||
          mark.y < -INTERIOR.height ||
          mark.x > INTERIOR.width * 2 ||
          mark.y > INTERIOR.height * 2,
      );

    expect(outside).toEqual([]);
  });
});
