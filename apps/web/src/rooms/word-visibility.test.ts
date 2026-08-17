import type { CrosswordLayout } from 'shared';
import { describe, expect, it } from 'vitest';

import type { ReadableRoom } from './room-access';
import { wordIdAt } from './room-document';
import {
  cellKey,
  finishedWordsOf,
  type GridView,
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

  it('says where a word to explain sits and what it is called, so the grid can write it in', () => {
    const room = roomWith(['bob-uid', 'alice-uid'], 'playing', CROSSING_LAYOUT);
    const view = wordViewFor(room, 'bob-uid');

    // `CAR` runs down from the top-left square, which `CAT` also begins in —
    // one number covers both, as a printed crossword would have it.
    expect(view.kind === 'dealt' && view.toExplain[0]).toMatchObject({
      id: 'w1',
      number: 1,
      orientation: 'down',
      word: 'car',
      cells: [
        { row: 0, col: 0 },
        { row: 1, col: 0 },
        { row: 2, col: 0 },
      ],
    });
  });

  it('numbers a word to guess without saying anything else about it', () => {
    const room = roomWith(['bob-uid', 'alice-uid'], 'playing', CROSSING_LAYOUT);
    const view = wordViewFor(room, 'alice-uid');

    // The number is what lets a guesser ask for a word again by name. It says
    // where the word starts, which the outlines of the squares already show.
    expect(view.kind === 'dealt' && view.toGuess[0]).toMatchObject({ id: 'w1', number: 1 });
  });

  it('drops a word that occupies no square at all', () => {
    // Nothing the generator makes, but a layout comes back out of a document
    // another client wrote. Such a word carries no number, has nowhere to be
    // drawn and nowhere to be typed, so an entry for it would name nothing.
    const layout: CrosswordLayout = {
      ...LAYOUT,
      placedWords: [{ word: 'ghost', orientation: 'across', cells: [] }, wordAt('bread')],
    };

    const room = roomWith(['bob-uid', 'alice-uid'], 'playing', layout);

    expect(wordViewFor(room, 'alice-uid')).toMatchObject({ kind: 'dealt', toExplain: [] });
    // Bob had nothing else, so what is left of his game is nothing at all.
    expect(wordViewFor(room, 'bob-uid')).toEqual({ kind: 'left-out' });
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

  const contentAt = (view: GridView, row: number, col: number) =>
    view.cells.find((cell) => cellKey(cell) === cellKey({ row, col }))?.content;

  const numberAt = (view: GridView, row: number, col: number) =>
    view.cells.find((cell) => cellKey(cell) === cellKey({ row, col }))?.number;

  /** How the whole board reads, square by square, for whoever is looking. */
  const boardOf = (view: GridView) =>
    view.cells.map((cell) => [cellKey(cell), cell.content.kind === 'empty' ? '' : cell.content]);

  /**
   * Every word of the layout that is hidden from this viewer and still open.
   *
   * Read straight off the fixture rather than from the module under test, and
   * off the whole layout rather than a list written into a test — a word added
   * to a fixture later is covered without anybody remembering to add it here.
   */
  const stillHiddenFrom = (room: ReadableRoom, viewerId: string) =>
    room.layout.placedWords.filter((_placed, index) => {
      const state = room.words[wordIdAt(index)];

      return state?.hiddenFromPlayerId === viewerId && state?.guessedByPlayerId == null;
    });

  it('draws the whole board, so every player sees the same shape', () => {
    const view = gridViewFor(dealtCrossing(), 'bob-uid');

    expect(view.rows).toBe(3);
    expect(view.cols).toBe(3);
    expect(view.cells).toHaveLength(CROSSING_LAYOUT.cells.length);
  });

  describe('what a square holds, and why', () => {
    // Alice explains `CAT` across the top and guesses the `CAR` running down
    // from its first square, so one board carries all three cases at once.
    const cases = [
      {
        situation: 'a square of a word the group has answered',
        guessedBy: ['bob-uid'],
        at: { row: 0, col: 1 },
        content: { kind: 'solved', letter: 'A' },
      },
      {
        situation: 'a square of a word this viewer explains',
        guessedBy: [],
        at: { row: 0, col: 1 },
        content: { kind: 'explained', letter: 'A' },
      },
      {
        situation: 'a square only a word hidden from this viewer runs through',
        guessedBy: [],
        at: { row: 2, col: 0 },
        content: { kind: 'empty' },
      },
      {
        situation: 'a square both an answered and an explained word run through',
        guessedBy: ['bob-uid'],
        at: { row: 0, col: 0 },
        content: { kind: 'solved', letter: 'C' },
      },
    ] as const;

    it.each(cases)('$situation', ({ guessedBy, at, content }) => {
      expect(contentAt(gridViewFor(dealtCrossing(guessedBy), 'alice-uid'), at.row, at.col)).toEqual(
        content,
      );
    });
  });

  it('never leaves a word hidden from the viewer readable off the board', () => {
    // The invariant the whole module exists for, stated over every word of the
    // layout rather than over the ones this file happens to name: a word still
    // to be guessed always has a square its guesser has to work out. Crossings
    // may hand them some of it — that is measured and accepted in
    // `docs/decisions/0015-explained-words-in-the-grid.md` — but never all.
    for (const room of [dealtCrossing(), dealtCrossing(['bob-uid'])]) {
      for (const viewerId of ['alice-uid', 'bob-uid', 'late-uid']) {
        const view = gridViewFor(room, viewerId);

        for (const word of stillHiddenFrom(room, viewerId)) {
          expect(
            word.cells.some((cell) => contentAt(view, cell.row, cell.col)?.kind === 'empty'),
          ).toBe(true);
        }
      }
    }
  });

  it('writes the words a player explains into their own grid, and says why they are there', () => {
    // `CAT` is Alice's to explain: she reads it in place, crossing the `CAR`
    // she still has to guess — which is what makes it a crossword rather than
    // a diagram beside a list.
    const view = gridViewFor(dealtCrossing(), 'alice-uid');

    expect([contentAt(view, 0, 0), contentAt(view, 0, 1), contentAt(view, 0, 2)]).toEqual([
      { kind: 'explained', letter: 'C' },
      { kind: 'explained', letter: 'A' },
      { kind: 'explained', letter: 'T' },
    ]);
  });

  it('leaves the squares of a word the viewer guesses empty, bar the ones it shares', () => {
    const view = gridViewFor(dealtCrossing(), 'alice-uid');

    // `CAR` runs down from the `C` of the `CAT` Alice explains, so its first
    // square arrives written and the two below it do not.
    expect(contentAt(view, 1, 0)).toEqual({ kind: 'empty' });
    expect(contentAt(view, 2, 0)).toEqual({ kind: 'empty' });
  });

  it('gives the two players of a room opposite boards of the same crossword', () => {
    const room = dealtCrossing();

    // `CAT` across for Alice, `CAR` down for Bob — the same squares, written in
    // for one player and blank for the other.
    expect(contentAt(gridViewFor(room, 'bob-uid'), 2, 0)).toEqual({
      kind: 'explained',
      letter: 'R',
    });
    expect(contentAt(gridViewFor(room, 'bob-uid'), 0, 2)).toEqual({ kind: 'empty' });
  });

  it('moves a word from the viewer alone to the whole group when its guesser answers it', () => {
    // Alice explains `CAT` and Bob has just answered it. Nothing new appears on
    // her screen — the letters were already there — but they stop being hers
    // alone, which is the difference between "explain this" and "this is done".
    const answered = gridViewFor(dealtCrossing(['bob-uid']), 'alice-uid');

    expect([contentAt(answered, 0, 1), contentAt(answered, 0, 2)]).toEqual([
      { kind: 'solved', letter: 'A' },
      { kind: 'solved', letter: 'T' },
    ]);
  });

  it('shows the letters of a solved word to everyone at once', () => {
    const solvedCat = dealtCrossing(['bob-uid']);

    // Bob had none of `CAT` before he answered it; now it reads the same on his
    // board as on the board of the player who was explaining it.
    for (const viewerId of ['bob-uid', 'alice-uid']) {
      const view = gridViewFor(solvedCat, viewerId);

      expect([contentAt(view, 0, 0), contentAt(view, 0, 1), contentAt(view, 0, 2)]).toEqual([
        { kind: 'solved', letter: 'C' },
        { kind: 'solved', letter: 'A' },
        { kind: 'solved', letter: 'T' },
      ]);
    }
  });

  it('fills in a square of an unsolved word when a solved word crosses it', () => {
    // `CAR` shares its first square with `CAT`, so solving `CAT` hands its
    // owner a letter they never typed — the crossword doing what it is for.
    const view = gridViewFor(dealtCrossing(['bob-uid']), 'alice-uid');

    expect(contentAt(view, 0, 0)).toEqual({ kind: 'solved', letter: 'C' });
    expect(contentAt(view, 1, 0)).toEqual({ kind: 'empty' });
    expect(contentAt(view, 2, 0)).toEqual({ kind: 'empty' });
  });

  it('gives a player the squares of their own words and of no others', () => {
    const view = gridViewFor(dealtCrossing(), 'alice-uid');

    expect(view.toGuess.map(({ id }) => id)).toEqual(['w1']);
    expect(JSON.stringify(view.toGuess)).not.toMatch(/\bcar\b/i);
  });

  it('gives a player the number of each word of their own, so they can ask for it', () => {
    const view = gridViewFor(dealtCrossing(), 'alice-uid');

    // `CAT` and `CAR` begin in the same square and share its number, so Alice
    // guesses "one down" and explains "one across".
    expect(view.toGuess.map(({ number, orientation }) => `${number} ${orientation}`)).toEqual([
      '1 down',
    ]);
  });

  it('shows a player the deal did not cover nothing at all', () => {
    // The case the inverted invariant breaks in most easily: every word of the
    // crossword is one this player does not have to guess, so a grid that asked
    // "which words are not hidden from me?" would write the whole thing out.
    const view = gridViewFor(dealtCrossing(), 'late-uid');

    expect(view.toGuess).toEqual([]);
    expect(view.cells.every((cell) => cell.content.kind === 'empty')).toBe(true);
  });

  it('shows nothing, and offers nothing to type, while the room is still in the lobby', () => {
    const lobby = roomWith([null, null], 'lobby', CROSSING_LAYOUT);
    const view = gridViewFor(lobby, 'alice-uid');

    // Nothing has been dealt, so nobody explains anything yet — and the owner
    // who typed the words in sees exactly what a stranger does.
    expect(view.toGuess).toEqual([]);
    expect(view.cells.every((cell) => cell.content.kind === 'empty')).toBe(true);
    expect(boardOf(view)).toEqual(boardOf(gridViewFor(lobby, 'nobody-uid')));
  });

  it('gives nothing to type in a closed room, even with a word left open in it', () => {
    // A room can be closed without its crossword having been finished, and it
    // is finished with its players either way — a grid still taking answers
    // under a notice saying the room is closed would be lying to them.
    const room = roomWith(['bob-uid', 'alice-uid'], 'completed', CROSSING_LAYOUT);

    expect(gridViewFor(room, 'alice-uid').toGuess).toEqual([]);
  });

  it('numbers the square a word begins in, with one number for the two that begin together', () => {
    // `CAT` and `CAR` both start in the top-left square, so it carries a single
    // number — and no square either word merely runs through carries one.
    const view = gridViewFor(dealtCrossing(), 'bob-uid');

    expect(numberAt(view, 0, 0)).toBe(1);
    expect(view.cells.filter((cell) => cell.number !== null)).toHaveLength(1);
  });

  it('numbers the board the same way on every screen, whatever has been solved', () => {
    const numbers = (room: ReadableRoom, viewerId: string) =>
      gridViewFor(room, viewerId).cells.map(({ number }) => number);

    // Derived from the layout, which never changes: not from who is looking,
    // and not from how far the game has got.
    expect(numbers(dealtCrossing(['bob-uid']), 'alice-uid')).toEqual(
      numbers(dealtCrossing(), 'late-uid'),
    );
  });

  it('ignores a guessed-by another client wrote nonsense into', () => {
    const room = {
      ...dealtCrossing(),
      words: {
        w0: { hiddenFromPlayerId: 'bob-uid', guessedByPlayerId: '' },
        w1: { hiddenFromPlayerId: 'alice-uid', guessedByPlayerId: null },
      },
    } as unknown as ReadableRoom;

    // `CAT` is Bob's to guess and nobody has answered it, so no square of it
    // has been earned; the `CAR` he explains is still written in for him.
    expect(contentAt(gridViewFor(room, 'bob-uid'), 0, 1)).toEqual({ kind: 'empty' });
    expect(gridViewFor(room, 'bob-uid').cells.some((cell) => cell.content.kind === 'solved')).toBe(
      false,
    );
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
