import { describe, expect, it } from 'vitest';

import { answeredWordsOfWatched } from './answered-words';
import type { PlayerWordView, WatchedExplanation } from './word-visibility';

/**
 * The cards on the line over a lesson teacher's board: every word that has been
 * answered, by whoever explained it. A player's own cards are `answeredWordsOf`.
 */

const word = (id: string, number: number, text: string, isSolved: boolean) => ({
  id,
  number,
  orientation: 'across' as const,
  word: text,
  cells: [],
  isSolved,
});

const explanation = (words: WatchedExplanation['words']): WatchedExplanation => ({
  explainerId: 'olena-uid',
  guesserId: 'taras-uid',
  words,
});

describe('answeredWordsOfWatched', () => {
  it('lists the answered words of both students in the order the board numbers them', () => {
    const view: PlayerWordView = {
      kind: 'watched',
      left: explanation([word('w0', 1, 'bread', true), word('w4', 5, 'dinner', false)]),
      right: explanation([word('w1', 2, 'engine', true), word('w3', 4, 'apple', true)]),
    };

    expect(answeredWordsOfWatched(view)).toEqual(['bread', 'engine', 'apple']);
  });

  it('puts two words that share a number in the order the layout holds them', () => {
    const view: PlayerWordView = {
      kind: 'watched',
      left: explanation([word('w10', 3, 'ten', true)]),
      right: explanation([word('w2', 3, 'two', true)]),
    };

    expect(answeredWordsOfWatched(view)).toEqual(['two', 'ten']);
  });

  it('hangs nothing when no word has been answered', () => {
    const view: PlayerWordView = {
      kind: 'watched',
      left: explanation([word('w0', 1, 'bread', false)]),
      right: explanation([]),
    };

    expect(answeredWordsOfWatched(view)).toEqual([]);
  });

  it('hangs nothing for anybody who is not the teacher: a player’s cards are their own', () => {
    for (const view of [
      { kind: 'not-dealt' },
      { kind: 'left-out' },
      { kind: 'dealt', toExplain: [word('w0', 1, 'bread', true)], toGuess: [] },
    ] as const satisfies readonly PlayerWordView[]) {
      expect(answeredWordsOfWatched(view)).toEqual([]);
    }
  });
});
