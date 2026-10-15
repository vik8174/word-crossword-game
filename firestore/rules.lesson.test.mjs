import { readFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteField, doc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

/**
 * Behaviour tests for the lesson half of `firestore.rules`, run against the
 * Firestore emulator (`pnpm test:rules`).
 *
 * A lesson is a room with a mode and a teacher
 * (`docs/decisions/0037-a-lesson-is-run-by-a-teacher-who-does-not-play.md`):
 * the owner teaches and is not a player, so the room is born with nobody in
 * `players` and the teacher's nickname and presence mark live in `teacher`.
 * Each case the issue names is one test here. Whether a pair game kept every
 * rule it had is `rules.test.mjs`, which this file does not touch.
 *
 * A project of its own, because `node --test` runs the files of this folder at
 * the same time and both clear the emulator between tests: two files on one
 * project would delete each other's rooms mid-test.
 */

const PROJECT_ID = 'demo-word-crossword-lesson';
const TEACHER = 'teacher-uid';
const STUDENT_A = 'student-a-uid';
const STUDENT_B = 'student-b-uid';
const STUDENT_C = 'student-c-uid';
const ROOM_PATH = 'rooms/lesson-1';

const HOUR_MS = 60 * 60 * 1000;

const hoursFromNow = (hours) => Timestamp.fromMillis(Date.now() + hours * HOUR_MS);

const LAYOUT = {
  rows: 1,
  cols: 3,
  cells: [
    { row: 0, col: 0, letter: 'C' },
    { row: 0, col: 1, letter: 'A' },
    { row: 0, col: 2, letter: 'T' },
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
  ],
  unplacedWords: [],
};

const student = (nickname) => ({
  nickname,
  joinedAt: Timestamp.now(),
  lastSeenAt: Timestamp.now(),
});

/** A lesson exactly as `buildRoomDocument` produces it: nobody in `players`, the teacher beside them. */
const lessonOwnedBy = (ownerId, overrides = {}) => ({
  status: 'lobby',
  mode: 'lesson',
  ownerId,
  teacher: { nickname: 'Carmen', lastSeenAt: Timestamp.now() },
  layout: LAYOUT,
  words: { w0: { hiddenFromPlayerId: null, guessedByPlayerId: null } },
  players: {},
  createdAt: Timestamp.now(),
  expiresAt: hoursFromNow(24),
  ...overrides,
});

/** A pair game as the app writes it today, with its mode stated. */
const pairOwnedBy = (ownerId, overrides = {}) => ({
  status: 'lobby',
  mode: 'pair',
  ownerId,
  layout: LAYOUT,
  words: { w0: { hiddenFromPlayerId: null, guessedByPlayerId: null } },
  players: { [ownerId]: { nickname: 'Vik', joinedAt: Timestamp.now() } },
  createdAt: Timestamp.now(),
  expiresAt: hoursFromNow(24),
  ...overrides,
});

/** A pair game written before lessons existed: no `mode` field at all. */
const legacyPairOwnedBy = (ownerId) => {
  const { mode: _mode, ...room } = pairOwnedBy(ownerId);

  return room;
};

let testEnv;

const as = (uid) => testEnv.authenticatedContext(uid).firestore();

/** Puts an existing room in place, bypassing the rules under test. */
const seed = (room) =>
  testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), ROOM_PATH), room);
  });

const lessonWith = (students, overrides = {}) =>
  lessonOwnedBy(TEACHER, {
    players: Object.fromEntries(students.map((id) => [id, student(id)])),
    ...overrides,
  });

/** The write the teacher's client makes every fifteen seconds. */
const teacherMark = () => ({
  'teacher.lastSeenAt': new Date(),
  expiresAt: new Date(Date.now() + 24 * HOUR_MS),
});

/** What joining by the link writes. */
const joinWrite = (uid) => ({
  [`players.${uid}`]: { nickname: uid, joinedAt: new Date(), lastSeenAt: new Date() },
  expiresAt: new Date(Date.now() + 24 * HOUR_MS),
});

const dealWrite = () => ({
  status: 'playing',
  'words.w0.hiddenFromPlayerId': STUDENT_A,
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

describe('creating a lesson', () => {
  it('is allowed for a teacher: nobody in players, their own nickname and mark beside them', async () => {
    await testEnv.clearFirestore();

    await assertSucceeds(setDoc(doc(as(TEACHER), ROOM_PATH), lessonOwnedBy(TEACHER)));
  });

  it('accepts the plain JavaScript date the client actually writes for the teacher mark', async () => {
    await testEnv.clearFirestore();
    const room = lessonOwnedBy(TEACHER, {
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * HOUR_MS),
      teacher: { nickname: 'Carmen', lastSeenAt: new Date() },
    });

    await assertSucceeds(setDoc(doc(as(TEACHER), ROOM_PATH), room));
  });

  it('is refused when a player is in players, the teacher included', async () => {
    await testEnv.clearFirestore();

    await assertFails(
      setDoc(
        doc(as(TEACHER), ROOM_PATH),
        lessonOwnedBy(TEACHER, { players: { [TEACHER]: student('Carmen') } }),
      ),
    );
    await assertFails(
      setDoc(
        doc(as(TEACHER), ROOM_PATH),
        lessonOwnedBy(TEACHER, { players: { [STUDENT_A]: student('Olena') } }),
      ),
    );
  });

  it('is refused without the teacher, or with a teacher that is not a nickname and a mark', async () => {
    await testEnv.clearFirestore();
    const { teacher: _teacher, ...withoutTeacher } = lessonOwnedBy(TEACHER);
    const bad = (teacher) =>
      setDoc(doc(as(TEACHER), ROOM_PATH), lessonOwnedBy(TEACHER, { teacher }));

    await assertFails(setDoc(doc(as(TEACHER), ROOM_PATH), withoutTeacher));
    await assertFails(bad({ nickname: 'Carmen' }));
    await assertFails(bad({ lastSeenAt: Timestamp.now() }));
    await assertFails(bad({ nickname: 7, lastSeenAt: Timestamp.now() }));
    await assertFails(bad({ nickname: 'Carmen', lastSeenAt: 'now' }));
    await assertFails(bad({ nickname: 'Carmen', lastSeenAt: Timestamp.now(), isAdmin: true }));
  });

  it('is refused when somebody else is named as the owner of it', async () => {
    await testEnv.clearFirestore();

    await assertFails(setDoc(doc(as(STUDENT_A), ROOM_PATH), lessonOwnedBy(TEACHER)));
  });

  it('is refused for a mode that is neither pair nor lesson', async () => {
    await testEnv.clearFirestore();

    await assertFails(setDoc(doc(as(TEACHER), ROOM_PATH), pairOwnedBy(TEACHER, { mode: 'class' })));
  });

  it('is allowed for a pair game that states its mode, and for one that does not', async () => {
    await testEnv.clearFirestore();
    await assertSucceeds(setDoc(doc(as(TEACHER), ROOM_PATH), pairOwnedBy(TEACHER)));

    await testEnv.clearFirestore();
    await assertSucceeds(setDoc(doc(as(TEACHER), ROOM_PATH), legacyPairOwnedBy(TEACHER)));
  });

  it('is refused for a pair game that carries a teacher, or that has its owner left out', async () => {
    await testEnv.clearFirestore();
    const teacher = { nickname: 'Carmen', lastSeenAt: Timestamp.now() };

    await assertFails(setDoc(doc(as(TEACHER), ROOM_PATH), pairOwnedBy(TEACHER, { teacher })));
    await assertFails(setDoc(doc(as(TEACHER), ROOM_PATH), pairOwnedBy(TEACHER, { players: {} })));
  });
});

describe('the teacher marking themselves present', () => {
  for (const students of [[], [STUDENT_A], [STUDENT_A, STUDENT_B]]) {
    it(`is allowed in the lobby with ${students.length} student${students.length === 1 ? '' : 's'} in`, async () => {
      await testEnv.clearFirestore();
      await seed(lessonWith(students));

      await assertSucceeds(updateDoc(doc(as(TEACHER), ROOM_PATH), teacherMark()));
    });
  }

  it('is allowed while the lesson is playing, which the teacher’s view of the game depends on', async () => {
    await testEnv.clearFirestore();
    await seed(lessonWith([STUDENT_A, STUDENT_B], { status: 'playing' }));

    await assertSucceeds(updateDoc(doc(as(TEACHER), ROOM_PATH), teacherMark()));
  });

  it('is refused to a student, for the mark and for the whole teacher entry alike', async () => {
    await testEnv.clearFirestore();
    await seed(lessonWith([STUDENT_A]));

    await assertFails(updateDoc(doc(as(STUDENT_A), ROOM_PATH), teacherMark()));
    await assertFails(
      updateDoc(doc(as(STUDENT_A), ROOM_PATH), {
        teacher: { nickname: 'Carmen', lastSeenAt: new Date() },
        expiresAt: new Date(Date.now() + 24 * HOUR_MS),
      }),
    );
  });

  it('is refused to a stranger who is no student either', async () => {
    await testEnv.clearFirestore();
    await seed(lessonWith([STUDENT_A]));

    await assertFails(updateDoc(doc(as(STUDENT_C), ROOM_PATH), teacherMark()));
  });

  it('cannot rename the teacher: the nickname they arrived under stays, even in their own hand', async () => {
    await testEnv.clearFirestore();
    await seed(lessonWith([STUDENT_A]));
    const rename = (uid) =>
      updateDoc(doc(as(uid), ROOM_PATH), {
        'teacher.nickname': 'Somebody else',
        expiresAt: new Date(Date.now() + 24 * HOUR_MS),
      });

    await assertFails(rename(TEACHER));
    await assertFails(rename(STUDENT_A));
  });

  it('is refused when the mark is not a timestamp', async () => {
    await testEnv.clearFirestore();
    await seed(lessonWith([]));

    await assertFails(
      updateDoc(doc(as(TEACHER), ROOM_PATH), {
        'teacher.lastSeenAt': 'just now',
        expiresAt: new Date(Date.now() + 24 * HOUR_MS),
      }),
    );
  });

  it('cannot be written into a pair game, which has no teacher', async () => {
    await testEnv.clearFirestore();
    await seed(pairOwnedBy(TEACHER));

    await assertFails(
      updateDoc(doc(as(TEACHER), ROOM_PATH), {
        teacher: { nickname: 'Carmen', lastSeenAt: new Date() },
        expiresAt: new Date(Date.now() + 24 * HOUR_MS),
      }),
    );
  });
});

describe('the mode of a room', () => {
  const changeMode = (uid, mode) =>
    updateDoc(doc(as(uid), ROOM_PATH), {
      mode,
      expiresAt: new Date(Date.now() + 24 * HOUR_MS),
    });

  it('cannot be changed from lesson to pair, by the teacher or by anyone else', async () => {
    await testEnv.clearFirestore();
    await seed(lessonWith([]));

    await assertFails(changeMode(TEACHER, 'pair'));
    await assertFails(changeMode(STUDENT_A, 'pair'));
  });

  it('cannot be changed from pair to lesson, by the owner or by anyone else', async () => {
    await testEnv.clearFirestore();
    await seed(pairOwnedBy(TEACHER));

    await assertFails(changeMode(TEACHER, 'lesson'));
    await assertFails(changeMode(STUDENT_A, 'lesson'));
  });

  it('cannot be set to lesson on a room written before lessons, where it reads as pair', async () => {
    await testEnv.clearFirestore();
    await seed(legacyPairOwnedBy(TEACHER));

    await assertFails(changeMode(TEACHER, 'lesson'));
    // And it is no way round the owner's seat either: the room is still a pair
    // game, so its owner stays in `players`.
    await assertFails(
      updateDoc(doc(as(TEACHER), ROOM_PATH), {
        mode: 'lesson',
        teacher: { nickname: 'Vik', lastSeenAt: new Date() },
        [`players.${TEACHER}`]: deleteField(),
        expiresAt: new Date(Date.now() + 24 * HOUR_MS),
      }),
    );
  });

  it('cannot be removed from a lesson', async () => {
    await testEnv.clearFirestore();
    await seed(lessonWith([]));

    await assertFails(
      updateDoc(doc(as(TEACHER), ROOM_PATH), {
        mode: deleteField(),
        expiresAt: new Date(Date.now() + 24 * HOUR_MS),
      }),
    );
  });

  it('still lets a pair game written before lessons go on being played', async () => {
    await testEnv.clearFirestore();
    await seed(legacyPairOwnedBy(TEACHER));

    await assertSucceeds(updateDoc(doc(as(STUDENT_A), ROOM_PATH), joinWrite(STUDENT_A)));
  });

  it('keeps the owner of a pair game inside players, however the mode is spelt', async () => {
    await testEnv.clearFirestore();
    await seed(
      pairOwnedBy(TEACHER, { players: { [TEACHER]: student('Vik'), [STUDENT_A]: student('Bob') } }),
    );

    await assertFails(
      updateDoc(doc(as(STUDENT_A), ROOM_PATH), {
        [`players.${TEACHER}`]: deleteField(),
        expiresAt: new Date(Date.now() + 24 * HOUR_MS),
      }),
    );
  });
});

describe('students joining a lesson', () => {
  it('is allowed for the first, and for the second', async () => {
    await testEnv.clearFirestore();
    await seed(lessonWith([]));

    await assertSucceeds(updateDoc(doc(as(STUDENT_A), ROOM_PATH), joinWrite(STUDENT_A)));
    await assertSucceeds(updateDoc(doc(as(STUDENT_B), ROOM_PATH), joinWrite(STUDENT_B)));
  });

  it('is refused for a third, since a lesson is played by exactly two', async () => {
    await testEnv.clearFirestore();
    await seed(lessonWith([STUDENT_A, STUDENT_B]));

    await assertFails(updateDoc(doc(as(STUDENT_C), ROOM_PATH), joinWrite(STUDENT_C)));
  });

  it('lets a lobby seat change hands in the one write that takes it, as in a pair game', async () => {
    await testEnv.clearFirestore();
    await seed(lessonWith([STUDENT_A, STUDENT_B]));

    await assertSucceeds(
      updateDoc(doc(as(STUDENT_C), ROOM_PATH), {
        ...joinWrite(STUDENT_C),
        [`players.${STUDENT_B}`]: deleteField(),
      }),
    );
  });

  it('is refused once the words are dealt', async () => {
    await testEnv.clearFirestore();
    await seed(lessonWith([STUDENT_A], { status: 'playing' }));

    await assertFails(updateDoc(doc(as(STUDENT_B), ROOM_PATH), joinWrite(STUDENT_B)));
  });

  it('is refused for the teacher’s own uid: the teacher is not a player', async () => {
    await testEnv.clearFirestore();
    await seed(lessonWith([]));

    await assertFails(updateDoc(doc(as(TEACHER), ROOM_PATH), joinWrite(TEACHER)));
  });
});

describe('the teacher dealing the words', () => {
  it('is allowed with exactly two students in', async () => {
    await testEnv.clearFirestore();
    await seed(lessonWith([STUDENT_A, STUDENT_B]));

    await assertSucceeds(updateDoc(doc(as(TEACHER), ROOM_PATH), dealWrite()));
  });

  it('is refused with no student in, and with one', async () => {
    await testEnv.clearFirestore();
    await seed(lessonWith([]));
    await assertFails(updateDoc(doc(as(TEACHER), ROOM_PATH), dealWrite()));

    await testEnv.clearFirestore();
    await seed(lessonWith([STUDENT_A]));
    await assertFails(updateDoc(doc(as(TEACHER), ROOM_PATH), dealWrite()));
  });

  it('is refused to a student, who cannot start the lesson they are in', async () => {
    await testEnv.clearFirestore();
    await seed(lessonWith([STUDENT_A, STUDENT_B]));

    await assertFails(updateDoc(doc(as(STUDENT_A), ROOM_PATH), dealWrite()));
  });

  it('leaves the two students exactly where they were: nobody may be dropped from a dealt lesson', async () => {
    await testEnv.clearFirestore();
    await seed(lessonWith([STUDENT_A, STUDENT_B], { status: 'playing' }));

    await assertFails(
      updateDoc(doc(as(STUDENT_B), ROOM_PATH), {
        [`players.${STUDENT_A}`]: deleteField(),
        expiresAt: new Date(Date.now() + 24 * HOUR_MS),
      }),
    );
  });
});
