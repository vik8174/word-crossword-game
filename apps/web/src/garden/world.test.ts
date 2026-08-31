import { describe, expect, it } from 'vitest';

import { CONGRATULATIONS, DOORS, GATE, HALL } from './locations';
import {
  BASE_FRAME_HEIGHT,
  frameFor,
  LANDMARKS,
  OPENING,
  openingOnScreen,
  toScreen,
  type Viewport,
} from './world';

const DESKTOP: Viewport = { width: 1440, height: 900 };
const PHONE: Viewport = { width: 375, height: 812 };

describe('frameFor', () => {
  it('shows the same height of world on every screen, whatever its shape', () => {
    // This is the whole rule, and everything else follows from it: a phone sees
    // a narrower slice of the same painting, not the whole painting made small.
    expect(frameFor(GATE, DESKTOP).height).toBe(BASE_FRAME_HEIGHT);
    expect(frameFor(GATE, PHONE).height).toBe(BASE_FRAME_HEIGHT);
    expect(frameFor(GATE, PHONE).width).toBeLessThan(frameFor(GATE, DESKTOP).width);
  });

  it('shows less of the world the closer the window stands', () => {
    expect(frameFor(HALL, DESKTOP).height).toBeLessThan(frameFor(DOORS, DESKTOP).height);
    expect(frameFor(DOORS, DESKTOP).height).toBeLessThan(frameFor(GATE, DESKTOP).height);
  });

  it('puts the place it was given in the middle of the window', () => {
    const frame = frameFor(DOORS, DESKTOP);
    const middle = toScreen({ x: DOORS.x, y: DOORS.y }, frame, DESKTOP);

    expect(middle.x).toBeCloseTo(DESKTOP.width / 2);
    expect(middle.y).toBeCloseTo(DESKTOP.height / 2);
  });

  it('survives a window that has not been measured yet', () => {
    // A canvas rendered but not laid out reports nothing, and a frame worked
    // out by dividing by that would be every projection below turning into a
    // number that is not one.
    const frame = frameFor(GATE, { width: 0, height: 0 });

    expect(Number.isFinite(frame.width)).toBe(true);
    expect(Number.isFinite(frame.height)).toBe(true);
  });
});

describe('toScreen', () => {
  it('puts a thing in the world where the window is showing it', () => {
    const frame = frameFor(GATE, DESKTOP);
    const gate = toScreen(LANDMARKS.gate, frame, DESKTOP);

    // The gate is a little to the left of the middle of the frame and below it,
    // which is what the game's name being hung above it depends on.
    expect(gate.x).toBeGreaterThan(0);
    expect(gate.x).toBeLessThan(DESKTOP.width);
    expect(gate.y).toBeGreaterThan(DESKTOP.height / 2);
  });

  it('moves a thing further for the same step of the world the closer the window is', () => {
    const step = { x: LANDMARKS.temple.x + 10, y: LANDMARKS.temple.y };
    const atDoors = toScreen(step, frameFor(DOORS, DESKTOP), DESKTOP);
    const middleAtDoors = toScreen(LANDMARKS.temple, frameFor(DOORS, DESKTOP), DESKTOP);
    const inHall = toScreen(step, frameFor(HALL, DESKTOP), DESKTOP);
    const middleInHall = toScreen(LANDMARKS.temple, frameFor(HALL, DESKTOP), DESKTOP);

    expect(inHall.x - middleInHall.x).toBeGreaterThan(atDoors.x - middleAtDoors.x);
  });
});

describe('openingOnScreen', () => {
  it('is a small rectangle in the distance from the gate', () => {
    const doorway = openingOnScreen(frameFor(GATE, DESKTOP), DESKTOP);

    expect(doorway.width).toBeGreaterThan(0);
    expect(doorway.width).toBeLessThan(DESKTOP.width / 2);
  });

  it('is bigger than the window itself once the window is inside it', () => {
    // Which is what being in the hall means: the frame is smaller than the
    // doorway, so there is nothing on the screen that is not the room — and
    // nothing on the screen that the weather may fall on, the doorway being a
    // hole in it. That holds for the end of a game as well as for the middle of
    // one, so the greeting a finished game asks for has no sky left to fall in
    // (see the note on `CONGRATULATIONS`).
    for (const inside of [HALL, CONGRATULATIONS]) {
      const doorway = openingOnScreen(frameFor(inside, DESKTOP), DESKTOP);

      expect(doorway.x).toBeLessThan(0);
      expect(doorway.y).toBeLessThan(0);
      expect(doorway.x + doorway.width).toBeGreaterThan(DESKTOP.width);
      expect(doorway.y + doorway.height).toBeGreaterThan(DESKTOP.height);
    }
  });

  it('grows as the window comes closer to it', () => {
    const fromGate = openingOnScreen(frameFor(GATE, DESKTOP), DESKTOP);
    const fromDoors = openingOnScreen(frameFor(DOORS, DESKTOP), DESKTOP);

    expect(fromDoors.width).toBeGreaterThan(fromGate.width);
  });

  it('keeps the doorway where the temple has it', () => {
    const frame = frameFor(DOORS, DESKTOP);
    const doorway = openingOnScreen(frame, DESKTOP);
    const middle = toScreen({ x: OPENING.x, y: OPENING.y }, frame, DESKTOP);

    expect(doorway.x + doorway.width / 2).toBeCloseTo(middle.x);
    expect(doorway.y + doorway.height / 2).toBeCloseTo(middle.y);
  });
});
