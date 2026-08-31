import { describe, expect, it } from 'vitest';

import {
  CAMERA_EASING,
  CAMERA_MS,
  eased,
  isSamePlace,
  PREPARE_MS,
  screenOpacity,
  travelled,
} from './camera';
import { CONGRATULATIONS, DOORS, GATE, HALL } from './locations';

/** The numbers the ticket decided, kept here so a drift is a failure and not a surprise. */
const DECIDED = { durationMs: 1100, prepareMs: 140, outFade: 0.22, inFade: 0.26 };

/** Where a cubic Bézier with its ends pinned is, along one axis, at its own parameter. */
const alongAxis = (first: number, second: number, t: number): number =>
  3 * (1 - t) * (1 - t) * t * first + 3 * (1 - t) * t * t * second + t * t * t;

/**
 * The curve named by {@link CAMERA_EASING}, sampled the slow and obvious way.
 *
 * Written out from the string rather than from the constants the solver uses,
 * so that the value quoted in the ticket and the curve the camera actually
 * travels on cannot drift apart without this failing.
 */
const curveFromTheName = (time: number): number => {
  const [firstX, firstY, secondX, secondY] = (/\(([^)]+)\)/.exec(CAMERA_EASING)?.[1] ?? '')
    .split(',')
    .map((part) => Number(part.trim()));

  let low = 0;
  let high = 1;

  for (let step = 0; step < 60; step += 1) {
    const middle = (low + high) / 2;

    if (alongAxis(firstX ?? 0, secondX ?? 1, middle) < time) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return alongAxis(firstY ?? 0, secondY ?? 1, (low + high) / 2);
};

describe('the numbers the camera was decided on', () => {
  it('travels for as long as the ticket said, and promises no more preparation than it allowed', () => {
    expect(CAMERA_MS).toBe(DECIDED.durationMs);
    expect(PREPARE_MS).toBe(DECIDED.prepareMs);
  });
});

describe('eased', () => {
  it('starts where it starts and ends where it ends', () => {
    expect(eased(0)).toBe(0);
    expect(eased(1)).toBe(1);
    expect(eased(-0.4)).toBe(0);
    expect(eased(3)).toBe(1);
  });

  it('is the curve its own name describes', () => {
    for (let step = 0; step <= 20; step += 1) {
      const time = step / 20;

      expect(eased(time), `at ${time}`).toBeCloseTo(curveFromTheName(time), 4);
    }
  });

  it('never goes backwards', () => {
    let last = -1;

    for (let step = 0; step <= 100; step += 1) {
      const now = eased(step / 100);

      expect(now).toBeGreaterThanOrEqual(last);
      last = now;
    }
  });

  it('is slowest at both ends and quickest in the middle', () => {
    // The whole of the decision this curve replaced: a camera that leaves
    // sharply takes the entire forest with it, and one that arrives sharply
    // lands in the temple with a bump.
    const start = eased(0.1) - eased(0);
    const middle = eased(0.55) - eased(0.45);
    const end = eased(1) - eased(0.9);

    expect(middle).toBeGreaterThan(start * 2);
    expect(middle).toBeGreaterThan(end * 2);
    // Symmetrical, so halfway through the time is halfway through the journey.
    expect(eased(0.5)).toBeCloseTo(0.5, 6);
  });
});

describe('travelled', () => {
  it('is where it set off from, and where it was going', () => {
    expect(travelled(GATE, HALL, 0)).toMatchObject({ x: GATE.x, y: GATE.y, zoom: GATE.zoom });
    expect(travelled(GATE, HALL, 1)).toMatchObject({ x: HALL.x, y: HALL.y, zoom: HALL.zoom });
  });

  it('calls itself by the name of the place it is going to', () => {
    // Anything that asks the camera where it is is asking so that it can put
    // something in the right place there; the answer that helps is the
    // destination, never a fifth name for a journey.
    expect(travelled(GATE, DOORS, 0.3).id).toBe(DOORS.id);
  });

  it('multiplies the magnification by the same factor over every equal part of the way', () => {
    // The point of interpolating it through its logarithm. Straight-line
    // interpolation is past two thirds of the way in at the halfway mark, and
    // the rest of the journey then has to be spent slowing down.
    const quarters = [0, 0.25, 0.5, 0.75, 1].map((share) => travelled(GATE, HALL, share).zoom);
    const factors = quarters.slice(1).map((zoom, index) => zoom / (quarters[index] ?? 1));

    // Equal parts of the *journey*, which the easing does not divide evenly in
    // time — so the factors are compared against each other by way of the curve.
    for (const share of [0.25, 0.5, 0.75]) {
      const expected = GATE.zoom * Math.pow(HALL.zoom / GATE.zoom, eased(share));

      expect(travelled(GATE, HALL, share).zoom).toBeCloseTo(expected, 10);
    }

    expect(factors.every((factor) => factor > 1)).toBe(true);
  });

  it('never overshoots the place it is going to', () => {
    for (let step = 0; step <= 50; step += 1) {
      const at = travelled(GATE, HALL, step / 50);

      expect(at.zoom).toBeGreaterThanOrEqual(GATE.zoom);
      expect(at.zoom).toBeLessThanOrEqual(HALL.zoom);
      expect(at.x).toBeGreaterThanOrEqual(GATE.x);
      expect(at.x).toBeLessThanOrEqual(HALL.x);
    }
  });
});

describe('isSamePlace', () => {
  it('knows that a game ending is not a journey', () => {
    // The hall and the hall at the end of a game are two locations and one
    // place. Without this the camera would run its whole duration going
    // nowhere, taking the interface off the screen and back on the way.
    expect(isSamePlace(HALL, CONGRATULATIONS)).toBe(true);
  });

  it('knows that the doors are not the gate', () => {
    expect(isSamePlace(GATE, DOORS)).toBe(false);
    expect(isSamePlace(DOORS, HALL)).toBe(false);
  });
});

describe('screenOpacity', () => {
  it('shows the whole interface when nothing is moving', () => {
    expect(screenOpacity(0)).toBe(1);
    expect(screenOpacity(1)).toBe(1);
  });

  it('has taken the screen away by the share of the journey the ticket named', () => {
    expect(screenOpacity(DECIDED.outFade)).toBe(0);
    expect(screenOpacity(DECIDED.outFade - 0.02)).toBeGreaterThan(0);
  });

  it('leaves the middle of the journey to the place alone', () => {
    for (const time of [0.25, 0.4, 0.5, 0.6, 0.72]) {
      expect(screenOpacity(time), `at ${time}`).toBe(0);
    }
  });

  it('has the screen ahead still invisible when the shift underneath it has finished', () => {
    // The shift between two screens of a room runs 180ms and is not this
    // ticket's to change, so it plays underneath the first sixth of every
    // journey. What it brings in must not be seen arriving before the camera
    // has got there.
    const whenTheShiftIsOver = 180 / CAMERA_MS;

    expect(screenOpacity(whenTheShiftIsOver)).toBeLessThan(0.25);
  });

  it('brings the screen ahead back over the last part of the way and no sooner', () => {
    expect(screenOpacity(1 - DECIDED.inFade)).toBe(0);
    expect(screenOpacity(1 - DECIDED.inFade + 0.01)).toBeGreaterThan(0);
    expect(screenOpacity(0.99)).toBeGreaterThan(0.9);
  });
});
