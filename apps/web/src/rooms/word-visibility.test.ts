import type { CrosswordLayout } from 'shared';
import { describe, expect, it } from 'vitest';

import type { ReadableRoom } from './room-access';
import { wordViewFor } from './word-visibility';

const wordAt = (word: string): CrosswordLayout['placedWords'][number] => ({
  word,
  orientation: 'across',
  cells: [{ row: 0, col: 0 }],
});

const LAYOUT: CrosswordLayout = {
  rows: 1,
  cols: 5,
  cells: [],
  placedWords: [wordAt('apple'), wordAt('bread'), wordAt('cheese')],
  unplacedWords: [],
};

const timestamp = (millis: number) => ({ toMillis: () => millis });

/** A room whose three words are assigned as told: one entry per placed word. */
const roomWith = (hiddenFrom: readonly (string | null)[]): ReadableRoom => ({
  status: 'playing',
  ownerId: 'alice-uid',
  layout: LAYOUT,
  words: Object.fromEntries(
    hiddenFrom.map((playerId, index) => [
      `w${index}`,
      { hiddenFromPlayerId: playerId, guessedByPlayerId: null },
    ]),
  ),
  players: {
    'alice-uid': { nickname: 'Alice', joinedAt: timestamp(1000) },
    'bob-uid': { nickname: 'Bob', joinedAt: timestamp(2000) },
  },
  createdAt: timestamp(1000),
  expiresAt: timestamp(9000),
});

describe('wordViewFor', () => {
  it('shows a player the words hidden from someone else, so they can explain them', () => {
    const view = wordViewFor(roomWith(['bob-uid', 'alice-uid', 'bob-uid']), 'alice-uid');

    expect(view.toExplain).toEqual([
      { id: 'w0', word: 'apple' },
      { id: 'w2', word: 'cheese' },
    ]);
  });

  it('counts the words hidden from a player without ever spelling them out', () => {
    const view = wordViewFor(roomWith(['bob-uid', 'alice-uid', 'bob-uid']), 'alice-uid');

    expect(view.toGuessCount).toBe(1);
    expect(view.toExplain.map(({ word }) => word)).not.toContain('bread');
  });

  it('gives the two players of a room opposite views of the same words', () => {
    const room = roomWith(['bob-uid', 'alice-uid', 'bob-uid']);
    const alice = wordViewFor(room, 'alice-uid');
    const bob = wordViewFor(room, 'bob-uid');

    expect(alice.toExplain.map(({ id }) => id)).toEqual(['w0', 'w2']);
    expect(bob.toExplain.map(({ id }) => id)).toEqual(['w1']);
    expect(alice.toGuessCount + bob.toGuessCount).toBe(LAYOUT.placedWords.length);
  });

  it('shows nothing at all while the room is still in the lobby', () => {
    expect(wordViewFor(roomWith([null, null, null]), 'alice-uid')).toEqual({
      toExplain: [],
      toGuessCount: 0,
    });
  });

  it('keeps a half-written assignment from leaking the words it did not reach', () => {
    const view = wordViewFor(roomWith(['bob-uid', null, null]), 'alice-uid');

    expect(view.toExplain).toEqual([{ id: 'w0', word: 'apple' }]);
    expect(view.toGuessCount).toBe(0);
  });

  it('ignores a word state another client wrote nonsense into', () => {
    const room = {
      ...roomWith(['bob-uid', 'alice-uid', 'bob-uid']),
      words: { w0: { hiddenFromPlayerId: 42, guessedByPlayerId: null } },
    } as unknown as ReadableRoom;

    expect(wordViewFor(room, 'alice-uid')).toEqual({ toExplain: [], toGuessCount: 0 });
  });
});
