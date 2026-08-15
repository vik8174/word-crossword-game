import type { CrosswordLayout } from 'shared';
import { describe, expect, it } from 'vitest';

import type { ReadableRoom } from './room-access';
import { type PlayerWordView, wordViewFor } from './word-visibility';

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
const roomWith = (
  hiddenFrom: readonly (string | null)[],
  status: ReadableRoom['status'] = 'playing',
): ReadableRoom => ({
  status,
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

const DEALT = ['bob-uid', 'alice-uid', 'bob-uid'];

describe('wordViewFor', () => {
  it('shows a player the words hidden from someone else, so they can explain them', () => {
    expect(wordViewFor(roomWith(DEALT), 'alice-uid')).toEqual({
      kind: 'dealt',
      toExplain: [
        { id: 'w0', word: 'apple' },
        { id: 'w2', word: 'cheese' },
      ],
      toGuessCount: 1,
    });
  });

  it('counts the words hidden from a player without ever spelling them out', () => {
    const view = wordViewFor(roomWith(DEALT), 'alice-uid');

    expect(JSON.stringify(view)).not.toMatch(/bread/i);
  });

  it('gives the two players of a room opposite views of the same words', () => {
    const room = roomWith(DEALT);
    const explainedIn = (view: PlayerWordView) =>
      view.kind === 'dealt' ? view.toExplain.map(({ id }) => id) : [];

    expect(explainedIn(wordViewFor(room, 'alice-uid'))).toEqual(['w0', 'w2']);
    expect(explainedIn(wordViewFor(room, 'bob-uid'))).toEqual(['w1']);
  });

  it('shows nothing at all while the room is still in the lobby', () => {
    expect(wordViewFor(roomWith([null, null, null], 'lobby'), 'alice-uid')).toEqual({
      kind: 'not-dealt',
    });
  });

  it('shows nothing in a room that is playing but was never dealt out', () => {
    expect(wordViewFor(roomWith([null, null, null]), 'alice-uid')).toEqual({ kind: 'not-dealt' });
  });

  it('shows nothing to a player the deal did not cover', () => {
    // Somebody who joined between the owner reading the room and writing the
    // deal is in the room but in nobody's assignment. Every word would read as
    // theirs to explain, which is the whole crossword.
    const room = roomWith(['bob-uid', 'alice-uid', 'bob-uid']);

    expect(wordViewFor(room, 'late-uid')).toEqual({ kind: 'left-out' });
  });

  it('keeps a half-written assignment from leaking the words it did not reach', () => {
    const view = wordViewFor(roomWith(['bob-uid', null, null]), 'alice-uid');

    expect(view).toEqual({ kind: 'left-out' });
  });

  it('ignores a word state another client wrote nonsense into', () => {
    const room = {
      ...roomWith(DEALT),
      words: { w0: { hiddenFromPlayerId: 42, guessedByPlayerId: null } },
    } as unknown as ReadableRoom;

    expect(wordViewFor(room, 'alice-uid')).toEqual({ kind: 'not-dealt' });
  });

  it('still shows a finished game to the players who played it', () => {
    const room = roomWith(DEALT, 'completed');

    expect(wordViewFor(room, 'alice-uid')).toMatchObject({ kind: 'dealt', toGuessCount: 1 });
  });
});
