import { describe, expect, it } from 'vitest';

import { CLOSED_AT, clothBand } from './cloth';
import { type ClothBrush, paintCloth } from './paint-cloth';
import type { Viewport } from './world';

const DESKTOP: Viewport = { width: 1440, height: 900 };

/** One thing a brush was told to do, and the numbers it was told to do it with. */
interface Mark {
  readonly call: string;
  readonly args: readonly number[];
}

/**
 * A brush that draws nothing and remembers everything.
 *
 * jsdom has no canvas, which is the ordinary reason a drawing goes unchecked.
 * It is not the reason it should be here: what this file has to get right is
 * that the pattern is laid out for the whole banner and not for each half of
 * it, and that is a question about coordinates rather than about pixels.
 *
 * Nothing follows a transform, because this drawing composes none: the cloth is
 * painted in the window's own pixels from first to last.
 */
const recordingBrush = () => {
  const marks: Mark[] = [];
  const gradient = { addColorStop: () => {} } as unknown as CanvasGradient;

  const record =
    (call: string) =>
    (...args: number[]) => {
      marks.push({ call, args });
    };

  const brush: ClothBrush = {
    clearRect: record('clearRect'),
    save: () => {},
    restore: () => {},
    beginPath: record('beginPath'),
    rect: record('rect'),
    ellipse: record('ellipse'),
    clip: record('clip'),
    fill: record('fill'),
    stroke: record('stroke'),
    fillRect: record('fillRect'),
    createLinearGradient: () => gradient,
    globalAlpha: 1,
    lineWidth: 1,
    fillStyle: '',
    strokeStyle: '',
  };

  return { brush, marks };
};

/** Everything drawn at one moment of the event. */
const painted = (time: number, viewport: Viewport = DESKTOP) => {
  const { brush, marks } = recordingBrush();

  paintCloth(brush, viewport, time);

  return marks;
};

/** The rectangles the two halves were clipped to. */
const halves = (marks: readonly Mark[]) =>
  marks
    .slice(
      marks.findIndex((mark) => mark.call === 'beginPath'),
      marks.findIndex((mark) => mark.call === 'clip'),
    )
    .filter((mark) => mark.call === 'rect');

describe('paintCloth', () => {
  it('clears the window before it paints, so the dimming does not deepen every frame', () => {
    // The one call here that is not drawing, and the whole reason this file has
    // a brush of its own. The dimming is half-transparent and is laid down on
    // every frame of the event: on a canvas nobody cleared it would compound to
    // black within a few frames, and the room the game was played in — which is
    // meant to go on showing through — would simply be gone.
    for (const time of [0, 0.3, 1]) {
      expect(painted(time)[0]?.call, `at ${time}`).toBe('clearRect');
    }
  });

  it('darkens the room before there is any cloth to see', () => {
    const marks = painted(0);

    // The first thing down after the clearing covers the window, and at the
    // start it is the only thing: the table is still the table, going quiet.
    expect(marks[1]?.call).toBe('fillRect');
    expect(marks[1]?.args).toEqual([0, 0, DESKTOP.width, DESKTOP.height]);
    expect(marks.filter((mark) => mark.call === 'clip')).toHaveLength(0);
  });

  it('grows the two halves in from the two edges by the same amount', () => {
    const [left, right] = halves(painted(0.3));

    expect(left?.args[0]).toBe(0);
    expect(left?.args[2]).toBe(right?.args[2]);
    expect(right?.args[0]).toBeCloseTo(DESKTOP.width - (right?.args[2] ?? 0), 6);
  });

  it('has them meeting exactly in the middle, and no sooner', () => {
    const middle = DESKTOP.width / 2;

    expect(halves(painted(CLOSED_AT))[0]?.args[2]).toBeCloseTo(middle, 6);
    expect(halves(painted(CLOSED_AT / 2))[0]?.args[2]).toBeLessThan(middle);
  });

  it('hangs both halves in the one band, so the cloth is one cloth', () => {
    const band = clothBand(DESKTOP);
    const [left, right] = halves(painted(0.4));

    for (const half of [left, right]) {
      expect(half?.args[1]).toBe(band.y);
      expect(half?.args[3]).toBe(band.height);
    }
  });

  it('prints the same pattern whatever the halves have uncovered of it', () => {
    // The claim the whole shape of this file is for. What is on the cloth was
    // on it before either half moved, so what changes between one moment and
    // the next is only how much of it has arrived — which is what lets the
    // pattern carry over the seam instead of meeting itself there.
    const shapesAt = (time: number) =>
      painted(time)
        .filter((mark) => mark.call === 'ellipse')
        .map((mark) => mark.args.join(','));

    expect(shapesAt(0.3)).toEqual(shapesAt(CLOSED_AT));
    expect(shapesAt(1)).toEqual(shapesAt(CLOSED_AT));
    expect(shapesAt(1).length).toBeGreaterThan(0);
  });

  it('leaves the middle of the banner clear for the words', () => {
    const band = clothBand(DESKTOP);
    const near = (mark: Mark) =>
      Math.abs((mark.args[0] ?? 0) - DESKTOP.width / 2) < DESKTOP.width * 0.15;
    const rings = painted(1).filter((mark) => mark.call === 'ellipse');
    const inTheMiddle = rings.filter(near);
    const outAtTheEdges = rings.filter((mark) => (mark.args[0] ?? 0) < DESKTOP.width * 0.15);

    expect(band.height).toBeGreaterThan(0);
    expect(inTheMiddle.length).toBeLessThan(outAtTheEdges.length);
  });

  it('runs a lit edge down the front of a half that is still moving, and not after', () => {
    const edges = (time: number) =>
      painted(time)
        .filter((mark) => mark.call === 'fillRect')
        // The dimming and the paper are the whole window and the whole band;
        // an edge is a few pixels wide.
        .filter((mark) => (mark.args[2] ?? 0) < 20);

    expect(edges(0.3)).toHaveLength(2);
    expect(edges(CLOSED_AT)).toHaveLength(0);
    expect(edges(1)).toHaveLength(0);
  });
});
