import { describe, expect, it } from 'vitest';

import { CONGRATULATIONS, DOORS, GATE, HALL, locationFor } from './locations';
import type { RoomScreen } from '../rooms/room-screen';

/** Every screen a room can be showing, so none of them can go unasked about. */
const EVERY_SCREEN: readonly RoomScreen['kind'][] = [
  'connecting',
  'unavailable',
  'join',
  'lobby',
  'playing',
  'finished',
  'closed-early',
];

describe('locationFor', () => {
  it('walks the room inwards: the gate, the doors, and the hall behind them', () => {
    // The order is the game. A visitor arrives outside, is let as far as the
    // doors while the room fills up, and is inside it once the words are dealt.
    expect(locationFor('join')).toBe(GATE);
    expect(locationFor('lobby')).toBe(DOORS);
    expect(locationFor('playing')).toBe(HALL);
  });

  it('ends a game where it was played, however it ended', () => {
    // Neither ending is a journey out of the room. A finished game is an event
    // at the table, and a game somebody stopped is the same table with words
    // left on it.
    expect(locationFor('finished')).toBe(CONGRATULATIONS);
    expect(locationFor('closed-early')).toBe(HALL);
    expect(CONGRATULATIONS.x).toBe(HALL.x);
    expect(CONGRATULATIONS.y).toBe(HALL.y);
    expect(CONGRATULATIONS.zoom).toBe(HALL.zoom);
  });

  it('gives the two screens that are not a phase of a game no place of their own', () => {
    // Waiting to hear from a room, and hearing that there is none, are news
    // rather than journeys — so they happen wherever the reader already is.
    expect(locationFor('connecting')).toBeNull();
    expect(locationFor('unavailable')).toBeNull();
  });

  it('goes further in at every step, and never back out', () => {
    const inwards = [GATE, DOORS, HALL];

    for (let step = 1; step < inwards.length; step += 1) {
      expect(inwards[step]!.zoom).toBeGreaterThan(inwards[step - 1]!.zoom);
    }
  });

  it('has an answer for every screen a room can be showing', () => {
    // The switch behind this has no `default`, so a screen added to `RoomScreen`
    // and not placed anywhere fails to compile. This is the other half of that:
    // an answer of `undefined` would compile and would be a screen drawn
    // nowhere.
    for (const kind of EVERY_SCREEN) {
      expect(locationFor(kind)).not.toBeUndefined();
    }
  });
});
