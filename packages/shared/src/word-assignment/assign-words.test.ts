import { describe, expect, it } from 'vitest';

import { assignWords } from './assign-words';
import type { RandomSource, WordAssignment } from './types';

/**
 * Randomness is what makes an assignment fair, and it is also what would make
 * these tests flaky if they asserted a particular outcome. Two answers, used
 * side by side:
 *
 * - the invariants the game depends on (one hidden player per word, an even
 *   spread, only players from the room) are asserted over many runs of the real
 *   random source, because they must hold for every draw;
 * - anything about a specific outcome is asserted against {@link sequence}, a
 *   stand-in random source handing out a fixed series of numbers.
 */
const PLAYERS = ['alice-uid', 'bob-uid', 'cara-uid', 'dan-uid'];

/** A `Math.random` stand-in that hands out the given numbers, cycling. */
const sequence = (values: readonly number[]): RandomSource => {
  let draw = 0;

  return () => values[draw++ % values.length] ?? 0;
};

/** How many words each player ended up having to guess. */
const wordsPerPlayer = (assignment: WordAssignment): readonly number[] => {
  const counts = new Map<string, number>();

  assignment.forEach((playerId) => counts.set(playerId, (counts.get(playerId) ?? 0) + 1));

  return [...counts.values()];
};

const timesOver = (runs: number) => Array.from({ length: runs }, (_unused, run) => run);

describe('assignWords', () => {
  it('gives every word exactly one player to guess it', () => {
    const assignment = assignWords({ wordCount: 14, playerIds: PLAYERS });

    expect(assignment).toHaveLength(14);
    assignment.forEach((playerId) => expect(PLAYERS).toContain(playerId));
  });

  it('never hides a word from someone who is not in the room', () => {
    timesOver(50).forEach(() => {
      const assignment = assignWords({ wordCount: 20, playerIds: PLAYERS.slice(0, 3) });

      expect(new Set(assignment).size).toBeLessThanOrEqual(3);
      assignment.forEach((playerId) => expect(PLAYERS.slice(0, 3)).toContain(playerId));
    });
  });

  it('spreads the words evenly, whatever the draw', () => {
    [2, 3, 4].forEach((playerCount) => {
      [10, 13, 17, 20].forEach((wordCount) => {
        timesOver(20).forEach(() => {
          const counts = wordsPerPlayer(
            assignWords({ wordCount, playerIds: PLAYERS.slice(0, playerCount) }),
          );

          expect(counts).toHaveLength(playerCount);
          expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
        });
      });
    });
  });

  it('leaves nobody without a word to guess, even with fewer words than usual', () => {
    const counts = wordsPerPlayer(assignWords({ wordCount: 4, playerIds: PLAYERS }));

    expect(counts).toEqual([1, 1, 1, 1]);
  });

  it('does not always hand the spare word to the same player', () => {
    // 5 words between 2 players: one of them always guesses three. Which one is
    // a draw, not a property of being listed first.
    const spareHolders = new Set(
      timesOver(200).map(() => {
        const assignment = assignWords({ wordCount: 5, playerIds: PLAYERS.slice(0, 2) });

        return assignment.find(
          (playerId) => assignment.filter((other) => other === playerId).length === 3,
        );
      }),
    );

    expect(spareHolders.size).toBe(2);
  });

  it('does not hand out the same assignment every time', () => {
    const outcomes = new Set(
      timesOver(50).map(() =>
        assignWords({ wordCount: 12, playerIds: PLAYERS.slice(0, 3) }).join(),
      ),
    );

    expect(outcomes.size).toBeGreaterThan(1);
  });

  it('is decided entirely by the random source it is given', () => {
    const draws = [0.7, 0.1, 0.42, 0.93, 0.05, 0.6];
    const assign = () =>
      assignWords({ wordCount: 11, playerIds: PLAYERS, random: sequence(draws) });

    expect(assign()).toEqual(assign());
  });

  it('produces a different assignment from a different draw', () => {
    const assign = (draws: readonly number[]) =>
      assignWords({ wordCount: 16, playerIds: PLAYERS, random: sequence(draws) }).join();

    expect(assign([0.1, 0.9, 0.3, 0.7])).not.toBe(assign([0.8, 0.2, 0.6, 0.4]));
  });

  it('refuses a room too small to play in — a hidden word needs an explainer', () => {
    expect(() => assignWords({ wordCount: 10, playerIds: ['alice-uid'] })).toThrow(/2 players/i);
    expect(() => assignWords({ wordCount: 10, playerIds: [] })).toThrow(/2 players/i);
  });

  it('refuses a crossword with no words in it', () => {
    expect(() => assignWords({ wordCount: 0, playerIds: PLAYERS })).toThrow(/word/i);
  });
});
