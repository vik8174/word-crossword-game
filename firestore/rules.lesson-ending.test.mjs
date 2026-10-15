import { readFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteField, doc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

/**
 * Behaviour tests for the half of `firestore.rules` that says what a lesson's
 * teacher and its students may write once the words are being dealt and played
 * (`docs/decisions/0037-a-lesson-is-run-by-a-teacher-who-does-not-play.md`),
 * run against the Firestore emulator (`pnpm test:rules`):
 *
 * - only the teacher may end a lesson early, by writing `closed`;
 * - the teacher's only write under `words` is the deal, and in a pair game
 *   nothing of the kind is asked of anybody.
 *
 * Each case the issue names is one test here. `rules.lesson.test.mjs` holds the
 * rest of a lesson (creating it, the marks, the seats, the deal's size) and
 * `rules.test.mjs` the pair game, which this file does not touch.
 *
 * A project of its own, because `node --test` runs the files of this folder at
 * the same time and each clears the emulator between tests: two files on one
 * project would delete each other's rooms mid-test.
 */

const PROJECT_ID = 'demo-word-crossword-lesson-ending';
const TEACHER = 'teacher-uid';
const STUDENT_A = 'student-a-uid';
const STUDENT_B = 'student-b-uid';
const STRANGER = 'stranger-uid';
const ROOM_PATH = 'rooms/lesson-1';

const HOUR_MS = 60 * 60 * 1000;

const hoursFromNow = (hours) => Timestamp.fromMillis(Date.now() + hours * HOUR_MS);

const cell = (row, col) => ({ row, col });

/** Three words, because a rule that walks the `words` map has to hold for more than one. */
const LAYOUT = {
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
    { word: 'cat', orientation: 'across', cells: [cell(0, 0), cell(0, 1), cell(0, 2)] },
    { word: 'car', orientation: 'down', cells: [cell(0, 0), cell(1, 0), cell(2, 0)] },
    { word: 'art', orientation: 'down', cells: [cell(0, 1), cell(1, 1), cell(2, 1)] },
  ],
  unplacedWords: [],
};

const OPEN = { hiddenFromPlayerId: null, guessedByPlayerId: null };
const noWords = () => ({ w0: { ...OPEN }, w1: { ...OPEN }, w2: { ...OPEN } });

/** The words as a deal leaves them: each one hidden from one of the two students. */
const dealtWords = () => ({
  w0: { hiddenFromPlayerId: STUDENT_A, guessedByPlayerId: null },
  w1: { hiddenFromPlayerId: STUDENT_B, guessedByPlayerId: null },
  w2: { hiddenFromPlayerId: STUDENT_A, guessedByPlayerId: null },
});

const student = (nickname) => ({
  nickname,
  joinedAt: Timestamp.now(),
  lastSeenAt: Timestamp.now(),
});

const BOTH_STUDENTS = { [STUDENT_A]: student('Olena'), [STUDENT_B]: student('Taras') };

/** A lesson with both students in, as it stands in the lobby unless told otherwise. */
const lesson = (overrides = {}) => ({
  status: 'lobby',
  mode: 'lesson',
  ownerId: TEACHER,
  teacher: { nickname: 'Carmen', lastSeenAt: Timestamp.now() },
  layout: LAYOUT,
  words: noWords(),
  players: BOTH_STUDENTS,
  createdAt: Timestamp.now(),
  expiresAt: hoursFromNow(24),
  ...overrides,
});

/** A lesson being played: the words are dealt out. */
const playingLesson = (overrides = {}) =>
  lesson({ status: 'playing', words: dealtWords(), ...overrides });

/** A pair game as the app writes it, the owner and one guest in it. */
const pairGame = (overrides = {}) => ({
  status: 'lobby',
  mode: 'pair',
  ownerId: TEACHER,
  layout: LAYOUT,
  words: noWords(),
  players: { [TEACHER]: student('Vik'), [STUDENT_A]: student('Olena') },
  createdAt: Timestamp.now(),
  expiresAt: hoursFromNow(24),
  ...overrides,
});

let testEnv;

const as = (uid) => testEnv.authenticatedContext(uid).firestore();

/** Puts an existing room in place, bypassing the rules under test. */
const seed = async (room) => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), ROOM_PATH), room);
  });
};

const update = (uid, fields) =>
  updateDoc(doc(as(uid), ROOM_PATH), {
    ...fields,
    expiresAt: new Date(Date.now() + 24 * HOUR_MS),
  });

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

after(async () => {
  await testEnv.cleanup();
});

describe('ending a lesson early', () => {
  it('is allowed to the teacher while the lesson is being played', async () => {
    await seed(playingLesson());

    await assertSucceeds(update(TEACHER, { status: 'closed' }));
  });

  it('is refused to a student, whichever of the two writes it', async () => {
    await seed(playingLesson());
    await assertFails(update(STUDENT_A, { status: 'closed' }));

    await seed(playingLesson());
    await assertFails(update(STUDENT_B, { status: 'closed' }));
  });

  it('is refused to somebody who is neither the teacher nor a student', async () => {
    await seed(playingLesson());

    await assertFails(update(STRANGER, { status: 'closed' }));
  });

  it('is refused to a student in the lobby too, where nobody has anything to end', async () => {
    await seed(lesson());

    await assertFails(update(STUDENT_A, { status: 'closed' }));
  });

  it('leaves a student able to write that the crossword was completed', async () => {
    // The other ending is not a decision. Every client that sees a full board
    // writes the same value, which is what lets a lesson finish whoever answers
    // last (docs/decisions/0012-ending-a-game-from-the-received-state.md).
    await seed(playingLesson());

    await assertSucceeds(update(STUDENT_A, { status: 'completed' }));
  });

  it('is not a way to take a closed lesson back, for the teacher or for anybody', async () => {
    await seed(playingLesson({ status: 'closed' }));

    await assertFails(update(TEACHER, { status: 'playing' }));
    await assertFails(update(STUDENT_A, { status: 'playing' }));
    await assertFails(update(STUDENT_A, { status: 'completed' }));
  });
});

describe('ending a pair game early', () => {
  const games = {
    'a pair game that states its mode': () => pairGame({ status: 'playing' }),
    'a pair game written before lessons, with no mode field': () => {
      const { mode: _mode, ...game } = pairGame({ status: 'playing' });

      return game;
    },
  };

  for (const [name, game] of Object.entries(games)) {
    it(`is still allowed to either player of ${name}`, async () => {
      await seed(game());
      await assertSucceeds(update(STUDENT_A, { status: 'closed' }));

      await seed(game());
      await assertSucceeds(update(TEACHER, { status: 'closed' }));
    });
  }
});

describe('the teacher dealing the words of a lesson', () => {
  const deal = (words) => ({
    status: 'playing',
    'words.w0.hiddenFromPlayerId': words.w0,
    'words.w1.hiddenFromPlayerId': words.w1,
    'words.w2.hiddenFromPlayerId': words.w2,
  });

  it('is allowed to set who each word is hidden from, and nothing else under words', async () => {
    await seed(lesson());

    await assertSucceeds(update(TEACHER, deal({ w0: STUDENT_A, w1: STUDENT_B, w2: STUDENT_A })));
  });

  it('is refused when the deal also sets who answered a word', async () => {
    await seed(lesson());

    await assertFails(
      update(TEACHER, {
        ...deal({ w0: STUDENT_A, w1: STUDENT_B, w2: STUDENT_A }),
        'words.w1.guessedByPlayerId': STUDENT_A,
      }),
    );
  });

  it('is refused when a word is hidden from somebody who is not one of the two students', async () => {
    await seed(lesson());

    await assertFails(update(TEACHER, deal({ w0: STUDENT_A, w1: STRANGER, w2: STUDENT_A })));
    await assertFails(update(TEACHER, deal({ w0: TEACHER, w1: STUDENT_B, w2: STUDENT_A })));
    await assertFails(update(TEACHER, deal({ w0: STUDENT_A, w1: STUDENT_B, w2: null })));
  });

  it('is refused when it names a word the room has not got', async () => {
    await seed(lesson());

    await assertFails(
      update(TEACHER, {
        ...deal({ w0: STUDENT_A, w1: STUDENT_B, w2: STUDENT_A }),
        'words.w3': { hiddenFromPlayerId: STUDENT_A, guessedByPlayerId: null },
      }),
    );
  });

  it('is refused when it renames a word key, which keeps the count of words', async () => {
    // The size of `words` is unchanged, so `keepsRoomIdentity` lets it through.
    // Only the key check of the deal refuses it.
    await seed(lesson());

    await assertFails(
      update(TEACHER, {
        status: 'playing',
        'words.w0.hiddenFromPlayerId': STUDENT_A,
        'words.w1.hiddenFromPlayerId': STUDENT_B,
        'words.w2': deleteField(),
        'words.w9': { hiddenFromPlayerId: STUDENT_A, guessedByPlayerId: null },
      }),
    );
  });

  it('is refused when the deal was already made, even with the same words', async () => {
    await seed(playingLesson());

    await assertFails(update(TEACHER, deal({ w0: STUDENT_B, w1: STUDENT_A, w2: STUDENT_B })));
  });
});

describe('the teacher writing under words when it is not the deal', () => {
  it('is refused in the lobby: a word hidden from a student', async () => {
    await seed(lesson());

    await assertFails(update(TEACHER, { 'words.w0.hiddenFromPlayerId': STUDENT_A }));
  });

  it('is refused in the lobby: a word answered', async () => {
    await seed(lesson());

    await assertFails(update(TEACHER, { 'words.w0.guessedByPlayerId': STUDENT_A }));
  });

  it('is refused in the lobby: the whole of the map written afresh', async () => {
    await seed(lesson());

    await assertFails(update(TEACHER, { words: dealtWords() }));
  });

  it('is refused after the deal: a word answered', async () => {
    await seed(playingLesson());

    await assertFails(update(TEACHER, { 'words.w0.guessedByPlayerId': STUDENT_A }));
    await assertFails(update(TEACHER, { 'words.w1.guessedByPlayerId': STUDENT_B }));
  });

  it('is refused after the deal: a word dealt to somebody else', async () => {
    await seed(playingLesson());

    await assertFails(update(TEACHER, { 'words.w0.hiddenFromPlayerId': STUDENT_B }));
  });

  it('is refused after the lesson has ended', async () => {
    await seed(playingLesson({ status: 'closed' }));

    await assertFails(update(TEACHER, { 'words.w0.guessedByPlayerId': STUDENT_A }));
  });

  it('is refused in the write that ends the lesson', async () => {
    await seed(playingLesson());

    await assertFails(
      update(TEACHER, { status: 'closed', 'words.w0.guessedByPlayerId': STUDENT_A }),
    );
  });

  it('leaves the teacher everything else: the presence mark, in the lobby and in the game', async () => {
    await seed(lesson());
    await assertSucceeds(update(TEACHER, { 'teacher.lastSeenAt': new Date() }));

    await seed(playingLesson());
    await assertSucceeds(update(TEACHER, { 'teacher.lastSeenAt': new Date() }));
  });
});

describe('a student writing under words in a lesson', () => {
  it('can still answer a word of the game, as a player always could', async () => {
    await seed(playingLesson());

    await assertSucceeds(update(STUDENT_B, { 'words.w0.guessedByPlayerId': STUDENT_B }));
  });
});

describe('a pair game, where the owner plays and nothing under words is the owner’s alone', () => {
  it('lets the owner answer a word of the game', async () => {
    await seed(
      pairGame({
        status: 'playing',
        words: {
          w0: { hiddenFromPlayerId: TEACHER, guessedByPlayerId: null },
          w1: { hiddenFromPlayerId: STUDENT_A, guessedByPlayerId: null },
          w2: { hiddenFromPlayerId: TEACHER, guessedByPlayerId: null },
        },
      }),
    );

    await assertSucceeds(update(TEACHER, { 'words.w0.guessedByPlayerId': TEACHER }));
  });

  it('lets the owner write a word in the lobby, and deal it with an answer in the same write', async () => {
    await seed(pairGame());
    await assertSucceeds(update(TEACHER, { 'words.w0.hiddenFromPlayerId': STUDENT_A }));

    await seed(pairGame());
    await assertSucceeds(
      update(TEACHER, {
        status: 'playing',
        'words.w0.hiddenFromPlayerId': STUDENT_A,
        'words.w1.hiddenFromPlayerId': TEACHER,
        'words.w2.hiddenFromPlayerId': STUDENT_A,
        'words.w1.guessedByPlayerId': STUDENT_A,
      }),
    );
  });

  it('lets the owner deal it to anybody the owner names, as before', async () => {
    await seed(pairGame());

    await assertSucceeds(
      update(TEACHER, {
        status: 'playing',
        'words.w0.hiddenFromPlayerId': STRANGER,
        'words.w1.hiddenFromPlayerId': TEACHER,
        'words.w2.hiddenFromPlayerId': STUDENT_A,
      }),
    );
  });
});
