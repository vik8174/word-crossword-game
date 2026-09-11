import { describe, expect, it } from 'vitest';

import { airFor, isGreeting } from './room-air';

describe('airFor', () => {
  it('puts petals behind every screen before a game and while it waits', () => {
    expect(airFor('connecting')).toBe('petals');
    expect(airFor('unavailable')).toBe('petals');
    expect(airFor('join')).toBe('petals');
    expect(airFor('lobby')).toBe('petals');
  });

  it('leaves the background of a game still', () => {
    expect(airFor('playing')).toBe('still');
  });

  it('leaves a game somebody ended still as well', () => {
    expect(airFor('closed-early')).toBe('still');
  });

  it('draws no petals once a game is finished, because the hall has no sky in it', () => {
    // A finished game stands inside the temple's hall, and no petal falls
    // indoors — geometry that used to be enforced by the camera's own doorway
    // culling and is now this switch's alone to keep (issue #152).
    expect(airFor('finished')).toBe('still');
  });
});

describe('isGreeting', () => {
  it('greets a game that was played to the end', () => {
    expect(isGreeting('playing', 'finished')).toBe(true);
  });

  it('does not greet a finished room somebody opened in a fresh tab', () => {
    expect(isGreeting(null, 'finished')).toBe(false);
    expect(isGreeting('connecting', 'finished')).toBe(false);
  });

  it('does not greet a game a player ended with words unanswered', () => {
    expect(isGreeting('playing', 'closed-early')).toBe(false);
  });

  it('does not greet the deal, or a screen that has not changed', () => {
    expect(isGreeting('lobby', 'playing')).toBe(false);
    expect(isGreeting('finished', 'finished')).toBe(false);
  });
});
