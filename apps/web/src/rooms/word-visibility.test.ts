import type { CrosswordLayout } from 'shared';
import { describe, expect, it } from 'vitest';

import type { ReadableRoom } from './room-access';
import {
  cellKey,
  finishedWordsOf,
  gridViewFor,
  type PlayerWordView,
  wordViewFor,
} from './word-visibility';

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

/**
 * `CAT` across and `CAR` down, sharing the `C`, on a 3x3 board — the smallest
 * grid where a solved word fills a square of an unsolved one.
 */
const CROSSING_LAYOUT: CrosswordLayout = {
  rows: 3,
  cols: 3,
  cells: [
    { row: 0, col: 0, letter: 'C' },
    { row: 0, col: 1, letter: 'A' },
    { row: 0, col: 2, letter: 'T' },
    { row: 1, col: 0, letter: 'A' },
    { row: 2, col: 0, letter: 'R' },
  ],
  placedWords: [
    {
      word: 'cat',
      orientation: 'across',
      cells: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ],
    },
    {
      word: 'car',
      orientation: 'down',
      cells: [
        { row: 0, col: 0 },
        { row: 1, col: 0 },
        { row: 2, col: 0 },
      ],
    },
  ],
  unplacedWords: [],
};

const timestamp = (millis: number) => ({ toMillis: () => millis });

/** A room whose words are assigned as told: one entry per placed word. */
const roomWith = (
  hiddenFrom: readonly (string | null)[],
  status: ReadableRoom['status'] = 'playing',
  layout: CrosswordLayout = LAYOUT,
  guessedBy: readonly (string | null)[] = [],
): ReadableRoom => ({
  status,
  ownerId: 'alice-uid',
  layout,
  words: Object.fromEntries(
    hiddenFrom.map((playerId, index) => [
      `w${index}`,
      { hiddenFromPlayerId: playerId, guessedByPlayerId: guessedBy[index] ?? null },
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

const guessedIds = (view: PlayerWordView) =>
  view.kind === 'dealt' ? view.toGuess.map(({ id }) => id) : [];

describe('wordViewFor', () => {
  it('shows a player the words hidden from someone else, so they can explain them', () => {
    expect(wordViewFor(roomWith(DEALT), 'alice-uid')).toMatchObject({
      kind: 'dealt',
      toExplain: [
        { id: 'w0', word: 'apple', isSolved: false },
        { id: 'w2', word: 'cheese', isSolved: false },
      ],
    });
  });

  it('says which of the words a player explains have already been answered', () => {
    const room = roomWith(DEALT, 'playing', LAYOUT, [null, null, 'bob-uid']);
    const view = wordViewFor(room, 'alice-uid');

    expect(view.kind === 'dealt' && view.toExplain.map((entry) => entry.isSolved)).toEqual([
      false,
      true,
    ]);
  });

  it('hands over the words hidden from a player without ever spelling them out', () => {
    const view = wordViewFor(roomWith(DEALT), 'alice-uid');

    expect(guessedIds(view)).toEqual(['w1']);
    expect(JSON.stringify(view)).not.toMatch(/bread/i);
  });

  it('tells a word to guess from any other word only by asking it', () => {
    const view = wordViewFor(roomWith(DEALT), 'alice-uid');
    const [bread] = view.kind === 'dealt' ? view.toGuess : [];

    expect(bread?.accepts('BREAD')).toBe(true);
    expect(bread?.accepts('apple')).toBe(false);
  });

  it('says where a word to guess sits, so there is somewhere to type it', () => {
    const room = roomWith(['bob-uid', 'alice-uid'], 'playing', CROSSING_LAYOUT);
    const view = wordViewFor(room, 'bob-uid');
    const [cat] = view.kind === 'dealt' ? view.toGuess : [];

    expect(cat).toMatchObject({
      id: 'w0',
      orientation: 'across',
      isSolved: false,
      cells: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ],
    });
  });

  it('reports a word of its own that somebody has already solved', () => {
    const room = roomWith(['bob-uid', 'alice-uid'], 'playing', CROSSING_LAYOUT, ['bob-uid']);
    const view = wordViewFor(room, 'bob-uid');

    expect(view.kind === 'dealt' && view.toGuess[0]?.isSolved).toBe(true);
  });

  it('gives the two players of a room opposite views of the same words', () => {
    const room = roomWith(DEALT);
    const explainedIn = (view: PlayerWordView) =>
      view.kind === 'dealt' ? view.toExplain.map(({ id }) => id) : [];

    expect(explainedIn(wordViewFor(room, 'alice-uid'))).toEqual(['w0', 'w2']);
    expect(explainedIn(wordViewFor(room, 'bob-uid'))).toEqual(['w1']);
    expect(guessedIds(wordViewFor(room, 'bob-uid'))).toEqual(['w0', 'w2']);
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

    expect(guessedIds(wordViewFor(room, 'alice-uid'))).toEqual(['w1']);
  });
});

describe('gridViewFor', () => {
  const dealtCrossing = (guessedBy: readonly (string | null)[] = []) =>
    roomWith(['bob-uid', 'alice-uid'], 'playing', CROSSING_LAYOUT, guessedBy);

  const letterAt = (view: ReturnType<typeof gridViewFor>, row: number, col: number) =>
    view.cells.find((cell) => cellKey(cell) === cellKey({ row, col }))?.letter;

  it('draws the whole board, so every player sees the same shape', () => {
    const view = gridViewFor(dealtCrossing(), 'bob-uid');

    expect(view.rows).toBe(3);
    expect(view.cols).toBe(3);
    expect(view.cells).toHaveLength(CROSSING_LAYOUT.cells.length);
  });

  it('holds back every letter while nothing has been solved', () => {
    const view = gridViewFor(dealtCrossing(), 'bob-uid');

    expect(view.cells.every((cell) => cell.letter === null)).toBe(true);
  });

  it('shows the letters of a solved word to everyone at once', () => {
    const solvedCat = dealtCrossing(['bob-uid']);

    for (const viewerId of ['bob-uid', 'alice-uid']) {
      const view = gridViewFor(solvedCat, viewerId);

      expect([letterAt(view, 0, 0), letterAt(view, 0, 1), letterAt(view, 0, 2)]).toEqual([
        'C',
        'A',
        'T',
      ]);
    }
  });

  it('fills in a square of an unsolved word when a solved word crosses it', () => {
    // `CAR` shares its first square with `CAT`, so solving `CAT` hands its
    // owner a letter they never typed — the crossword doing what it is for.
    const view = gridViewFor(dealtCrossing(['bob-uid']), 'alice-uid');

    expect(letterAt(view, 0, 0)).toBe('C');
    expect(letterAt(view, 1, 0)).toBeNull();
    expect(letterAt(view, 2, 0)).toBeNull();
  });

  it('gives a player the squares of their own words and of no others', () => {
    const view = gridViewFor(dealtCrossing(), 'alice-uid');

    expect(view.toGuess.map(({ id }) => id)).toEqual(['w1']);
    expect(JSON.stringify(view)).not.toMatch(/\bcar\b/i);
  });

  it('gives nothing to type to a player the deal did not cover', () => {
    const view = gridViewFor(dealtCrossing(), 'late-uid');

    expect(view.toGuess).toEqual([]);
    expect(view.cells.every((cell) => cell.letter === null)).toBe(true);
  });

  it('gives nothing to type while the room is still in the lobby', () => {
    const view = gridViewFor(roomWith([null, null], 'lobby', CROSSING_LAYOUT), 'alice-uid');

    expect(view.toGuess).toEqual([]);
  });

  it('ignores a guessed-by another client wrote nonsense into', () => {
    const room = {
      ...dealtCrossing(),
      words: {
        w0: { hiddenFromPlayerId: 'bob-uid', guessedByPlayerId: '' },
        w1: { hiddenFromPlayerId: 'alice-uid', guessedByPlayerId: null },
      },
    } as unknown as ReadableRoom;

    expect(gridViewFor(room, 'bob-uid').cells.every((cell) => cell.letter === null)).toBe(true);
  });
});

describe('finishedWordsOf', () => {
  const ANSWERED = ['bob-uid', 'alice-uid', 'bob-uid'];

  it('spells the whole crossword out once the game is over', () => {
    const room = roomWith(DEALT, 'completed', LAYOUT, ANSWERED);

    expect(finishedWordsOf(room)).toEqual(['apple', 'bread', 'cheese']);
  });

  it('says nothing at all while the game is still on', () => {
    // Every word here is one somebody still has to work out on their own.
    const room = roomWith(DEALT, 'playing', LAYOUT, ANSWERED);

    expect(finishedWordsOf(room)).toEqual([]);
  });

  it('does not read the word list out of a room somebody merely marked finished', () => {
    // A `completed` status is a client's word, which the security rules cannot
    // check against the `words` map. Without an answer on every word it buys
    // nothing here.
    const room = roomWith(DEALT, 'completed', LAYOUT, ['bob-uid', null, null]);

    expect(finishedWordsOf(room)).toEqual([]);
  });

  it('says nothing in a lobby either', () => {
    expect(finishedWordsOf(roomWith([null, null, null], 'lobby'))).toEqual([]);
  });
});
