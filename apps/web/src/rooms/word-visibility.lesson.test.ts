import type { CrosswordLayout } from 'shared';
import { describe, expect, it } from 'vitest';

import type { ReadableRoom } from './room-access';
import {
  answeredByLine,
  answeredByPhrase,
  answeredCountOf,
  gridViewFor,
  type PlayerWordView,
  wordViewFor,
  type WatchedWordView,
  watchedGridFor,
} from './word-visibility';

/**
 * What a lesson's teacher sees of the words, and what every other viewer of the
 * same room still sees (ADR 0037). A pair game's half is `word-visibility.test.ts`,
 * which this file leaves alone.
 */

const TEACHER = 'teacher-uid';
const OLENA = 'olena-uid';
const TARAS = 'taras-uid';
const STRANGER = 'stranger-uid';

/**
 * `CAT` across and `CAR` down sharing the `C`, and `RAT` across from the end of
 * `CAR`: three words on a 3 by 3 board, crossing twice.
 */
const LAYOUT: CrosswordLayout = {
  rows: 3,
  cols: 3,
  cells: [
    { row: 0, col: 0, letter: 'C' },
    { row: 0, col: 1, letter: 'A' },
    { row: 0, col: 2, letter: 'T' },
    { row: 1, col: 0, letter: 'A' },
    { row: 2, col: 0, letter: 'R' },
    { row: 2, col: 1, letter: 'A' },
    { row: 2, col: 2, letter: 'T' },
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
    {
      word: 'rat',
      orientation: 'across',
      cells: [
        { row: 2, col: 0 },
        { row: 2, col: 1 },
        { row: 2, col: 2 },
      ],
    },
  ],
  unplacedWords: [],
};

const timestamp = (millis: number) => ({ toMillis: () => millis });

type Hidden = readonly (string | null)[];

/** `cat` and `rat` are hidden from Olena, `car` from Taras: Taras explains the first two, Olena `car`. */
const DEALT: Hidden = [OLENA, TARAS, OLENA];

interface LessonOptions {
  readonly hiddenFrom?: Hidden;
  readonly guessedBy?: Hidden;
  readonly status?: ReadableRoom['status'];
  readonly mode?: 'pair' | 'lesson';
  readonly withMode?: boolean;
  readonly students?: ReadableRoom['players'];
}

/**
 * A lesson as Firestore hands it back: the teacher is the owner and is in no
 * entry of `players`, and Olena joined before Taras whatever order the keys are in.
 */
const lessonRoom = ({
  hiddenFrom = DEALT,
  guessedBy = [],
  status = 'playing',
  mode = 'lesson',
  withMode = true,
  students = {
    [TARAS]: { nickname: 'Taras', joinedAt: timestamp(2000) },
    [OLENA]: { nickname: 'Olena', joinedAt: timestamp(1000) },
  },
}: LessonOptions = {}): ReadableRoom => ({
  status,
  ...(withMode ? { mode } : {}),
  ownerId: TEACHER,
  teacher: { nickname: 'Carmen', lastSeenAt: timestamp(5000) },
  layout: LAYOUT,
  words: Object.fromEntries(
    hiddenFrom.map((playerId, index) => [
      `w${index}`,
      { hiddenFromPlayerId: playerId, guessedByPlayerId: guessedBy[index] ?? null },
    ]),
  ),
  players: students,
  createdAt: timestamp(1000),
  expiresAt: timestamp(9000),
});

const watched = (room: ReadableRoom, viewerId = TEACHER): WatchedWordView => {
  const view = wordViewFor(room, viewerId);

  if (view.kind !== 'watched') {
    throw new Error(`Expected the teacher's view, got ${view.kind}`);
  }

  return view;
};

const idsOf = (words: readonly { readonly id: string }[]) => words.map(({ id }) => id);

describe('wordViewFor, for the teacher of a lesson', () => {
  it('returns every dealt word, grouped by the student who explains it', () => {
    const view = watched(lessonRoom());

    // Olena explains what is hidden from Taras, and the other way round.
    expect(view.left).toMatchObject({ explainerId: OLENA, guesserId: TARAS });
    expect(view.right).toMatchObject({ explainerId: TARAS, guesserId: OLENA });
    expect(view.left.words).toMatchObject([{ id: 'w1', word: 'car' }]);
    expect(view.right.words).toMatchObject([
      { id: 'w0', word: 'cat' },
      { id: 'w2', word: 'rat' },
    ]);
  });

  it('says, for each word, where it runs, what it is called and whether it is answered', () => {
    const view = watched(lessonRoom({ guessedBy: [null, TARAS, null] }));

    expect(view.left.words).toEqual([
      {
        id: 'w1',
        number: 1,
        orientation: 'down',
        word: 'car',
        isSolved: true,
        cells: [
          { row: 0, col: 0 },
          { row: 1, col: 0 },
          { row: 2, col: 0 },
        ],
      },
    ]);
    expect(view.right.words.map(({ isSolved }) => isSolved)).toEqual([false, false]);
  });

  it('puts the student who joined first on the left, whatever order the document lists them in', () => {
    const swapped = lessonRoom({
      hiddenFrom: [TARAS, OLENA, TARAS],
      students: {
        [OLENA]: { nickname: 'Olena', joinedAt: timestamp(2000) },
        [TARAS]: { nickname: 'Taras', joinedAt: timestamp(1000) },
      },
    });

    // Taras joined first now, so he is on the left and explains what is hidden from Olena.
    expect(watched(swapped).left).toMatchObject({ explainerId: TARAS, guesserId: OLENA });
    expect(idsOf(watched(swapped).left.words)).toEqual(['w1']);
  });

  it('shows a word whose answer is recorded as answered, and one with an empty answer as not', () => {
    const view = watched(lessonRoom({ guessedBy: [OLENA, '', null] }));

    expect(view.right.words.map(({ isSolved }) => isSolved)).toEqual([true, false]);
  });

  it('shows no word before the deal, in the lobby or in a game whose words are not assigned yet', () => {
    expect(
      wordViewFor(lessonRoom({ status: 'lobby', hiddenFrom: [null, null, null] }), TEACHER),
    ).toEqual({ kind: 'not-dealt' });
    expect(wordViewFor(lessonRoom({ hiddenFrom: [null, null, null] }), TEACHER)).toEqual({
      kind: 'not-dealt',
    });
  });

  it('shows every word again after the lesson ends, whichever way it ended', () => {
    for (const status of ['closed', 'completed'] as const) {
      const view = watched(lessonRoom({ status, guessedBy: [OLENA, null, null] }));

      expect(idsOf(view.left.words)).toEqual(['w1']);
      expect(idsOf(view.right.words)).toEqual(['w0', 'w2']);
    }
  });

  it('leaves out a word hidden from nobody the lesson has, which the deal does not write', () => {
    const view = watched(lessonRoom({ hiddenFrom: [OLENA, TARAS, STRANGER] }));

    expect(idsOf(view.left.words)).toEqual(['w1']);
    expect(idsOf(view.right.words)).toEqual(['w0']);
  });

  it('shows nothing of a lesson that has not got both its students, which is not a lesson this app dealt', () => {
    const one = lessonRoom({
      students: { [OLENA]: { nickname: 'Olena', joinedAt: timestamp(1000) } },
    });

    expect(wordViewFor(one, TEACHER)).toEqual({ kind: 'not-dealt' });
  });

  it('is decided by the stored mode and the owner, and not by the teacher entry beside them', () => {
    const withoutTeacher: ReadableRoom = { ...lessonRoom(), teacher: undefined };

    expect(wordViewFor(withoutTeacher, TEACHER).kind).toBe('watched');
  });
});

describe('wordViewFor, for everybody who is not the teacher', () => {
  it('keeps a lesson student the view they have today: their two halves', () => {
    const view = wordViewFor(lessonRoom(), OLENA);

    expect(view).toMatchObject({
      kind: 'dealt',
      toExplain: [{ id: 'w1', word: 'car' }],
      toGuess: [{ id: 'w0' }, { id: 'w2' }],
    });
    expect(JSON.stringify(view)).not.toContain('"cat"');
  });

  it('keeps a pair game’s owner a player, with the view they have today', () => {
    // The same document read as a pair game, whose owner plays: no teacher, and the
    // owner in `players`. The owner's seat is what makes them a player, not the id.
    const pair: ReadableRoom = {
      ...lessonRoom({ hiddenFrom: [TEACHER, TARAS, TEACHER], mode: 'pair' }),
      teacher: undefined,
      players: {
        [TEACHER]: { nickname: 'Vik', joinedAt: timestamp(1000) },
        [TARAS]: { nickname: 'Taras', joinedAt: timestamp(2000) },
      },
    };
    const view: PlayerWordView = wordViewFor(pair, TEACHER);

    expect(view).toMatchObject({ kind: 'dealt', toGuess: [{ id: 'w0' }, { id: 'w2' }] });
  });

  it('reads a room with no mode at all as a pair game, whose owner is not a teacher', () => {
    const legacy: ReadableRoom = {
      ...lessonRoom({ hiddenFrom: [TARAS, TEACHER, TARAS], withMode: false }),
      teacher: undefined,
      players: {
        [TEACHER]: { nickname: 'Vik', joinedAt: timestamp(1000) },
        [TARAS]: { nickname: 'Taras', joinedAt: timestamp(2000) },
      },
    };

    expect(wordViewFor(legacy, TEACHER)).toMatchObject({ kind: 'dealt', toGuess: [{ id: 'w1' }] });
  });

  it('still tells a stranger to a lesson they were not dealt into that they are left out', () => {
    expect(wordViewFor(lessonRoom(), STRANGER)).toEqual({ kind: 'left-out' });
  });

  it('does not take a lesson’s student for the teacher: only `ownerId` is the key', () => {
    expect(wordViewFor(lessonRoom(), TARAS).kind).toBe('dealt');
  });
});

describe('answeredCountOf', () => {
  it('counts the answered words of one student’s explanation, and all of them', () => {
    const view = watched(lessonRoom({ guessedBy: [OLENA, null, null] }));

    expect(answeredCountOf(view.right.words)).toEqual({ answered: 1, total: 2 });
    expect(answeredCountOf(view.left.words)).toEqual({ answered: 0, total: 1 });
  });

  it('counts nothing of no words', () => {
    expect(answeredCountOf([])).toEqual({ answered: 0, total: 0 });
  });

  it('counts a word answered through its crossings as answered, since the room records it so', () => {
    // The count is read from the words and never from the squares of the board.
    const view = watched(lessonRoom({ guessedBy: [OLENA, OLENA, OLENA] }));

    expect(answeredCountOf([...view.left.words, ...view.right.words])).toEqual({
      answered: 3,
      total: 3,
    });
  });
});

describe('answeredByPhrase', () => {
  it('is the line without its full stop, which the lesson summary says in its heading', () => {
    expect(answeredByPhrase({ answered: 1, total: 3 }, 'Taras')).toBe('1 of 3 answered by Taras');
  });
});

describe('answeredByLine', () => {
  it('says how many of how many were answered, and by whom', () => {
    expect(answeredByLine({ answered: 1, total: 3 }, 'Taras')).toBe('1 of 3 answered by Taras.');
    expect(answeredByLine({ answered: 0, total: 2 }, 'Olena')).toBe('0 of 2 answered by Olena.');
  });
});

describe('watchedGridFor', () => {
  const faceAt = (room: ReadableRoom, row: number, col: number) =>
    watchedGridFor(room, TEACHER)?.cells.find((cell) => cell.row === row && cell.col === col);

  it('draws every square of every dealt word, each with whose it is', () => {
    const grid = watchedGridFor(lessonRoom(), TEACHER);

    expect(grid).toMatchObject({ rows: 3, cols: 3 });
    expect(grid?.cells).toHaveLength(7);
    // Olena explains `car`, down the first column; Taras explains `cat` and `rat`.
    expect(faceAt(lessonRoom(), 1, 0)).toMatchObject({ letter: 'A', face: 'left' });
    expect(faceAt(lessonRoom(), 0, 2)).toMatchObject({ letter: 'T', face: 'right' });
  });

  it('gives a square where the two students’ words cross to the left student', () => {
    // `C` and `R` are shared by `car` (Olena) and `cat` and `rat` (Taras).
    expect(faceAt(lessonRoom(), 0, 0)).toMatchObject({ letter: 'C', face: 'left', number: 1 });
    expect(faceAt(lessonRoom(), 2, 0)).toMatchObject({ letter: 'R', face: 'left', number: 2 });
  });

  it('draws an answered word’s squares answered, and a square it shares with an open word too', () => {
    const room = lessonRoom({ guessedBy: [null, TARAS, null] });

    expect(faceAt(room, 1, 0)?.face).toBe('answered');
    expect(faceAt(room, 0, 0)?.face).toBe('answered');
    expect(faceAt(room, 0, 1)?.face).toBe('right');
  });

  it('is nothing for anybody but the teacher, and nothing before the deal', () => {
    expect(watchedGridFor(lessonRoom(), OLENA)).toBeNull();
    expect(watchedGridFor(lessonRoom(), STRANGER)).toBeNull();
    expect(
      watchedGridFor(lessonRoom({ status: 'lobby', hiddenFrom: [null, null, null] }), TEACHER),
    ).toBeNull();
  });

  it('is not what a student’s board is: theirs holds no letter they have not earned', () => {
    const board = gridViewFor(lessonRoom(), OLENA);

    expect(board.cells.find((cell) => cell.row === 0 && cell.col === 2)?.content).toEqual({
      kind: 'empty',
    });
  });
});
