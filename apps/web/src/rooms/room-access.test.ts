import { describe, expect, it } from 'vitest';

import { AWAY_AFTER_MS, SEAT_FREE_AFTER_MS } from './presence';
import {
  abandonedSeatIn,
  hasFreeSeatIn,
  type MillisecondTimestamp,
  ownerNicknameOf,
  playersInJoinOrder,
  type ReadableRoom,
  roomAccessFor,
} from './room-access';

const at = (millis: number): MillisecondTimestamp => ({ toMillis: () => millis });

const NOW = new Date(1_000_000);

/** A player of the room, still marking themselves present unless told otherwise. */
const player = (nickname: string, joinedAtMillis = 0, silentForMs = 0) => ({
  nickname,
  joinedAt: at(joinedAtMillis),
  lastSeenAt: at(NOW.getTime() - silentForMs),
});

const roomWith = (
  players: Record<string, ReturnType<typeof player>>,
  expiresAtMillis = NOW.getTime() + 1,
  status: ReadableRoom['status'] = 'lobby',
): ReadableRoom => ({
  status,
  ownerId: 'owner-uid',
  layout: {
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
  },
  words: { w0: { hiddenFromPlayerId: null, guessedByPlayerId: null } },
  players,
  createdAt: at(0),
  expiresAt: at(expiresAtMillis),
});

/** A room with every seat taken: the two players a game is played by. */
const bothPlayers = Object.fromEntries(['a', 'b'].map((id) => [id, player(id.toUpperCase())]));

describe('roomAccessFor', () => {
  it('lets a player who is already in the room straight through', () => {
    const room = roomWith({ 'owner-uid': player('Vik') });

    expect(roomAccessFor(room, 'owner-uid', NOW)).toBe('joined');
  });

  it('offers a free seat to a newcomer', () => {
    const room = roomWith({ 'owner-uid': player('Vik') });

    expect(roomAccessFor(room, 'guest-uid', NOW)).toBe('joinable');
  });

  it('turns a third player away', () => {
    expect(roomAccessFor(roomWith(bothPlayers), 'guest-uid', NOW)).toBe('full');
  });

  it('still lets the two who are in play', () => {
    expect(roomAccessFor(roomWith(bothPlayers), 'a', NOW)).toBe('joined');
  });

  it('turns away a newcomer once the words have been dealt out', () => {
    // Every word of a started room is hidden from one of the players who were
    // in at the deal, so a latecomer would be shown all of them at once.
    const room = roomWith({ 'owner-uid': player('Vik') }, NOW.getTime() + 1, 'playing');

    expect(roomAccessFor(room, 'guest-uid', NOW)).toBe('started');
  });

  it.each(['completed', 'closed'] as const)(
    'tells a newcomer arriving after a %s game that it is over',
    (status) => {
      // Turned away either way, but "come back later" would be a lie about a
      // room whose game has already been played to its last word — or about one
      // its players ended, which is over just as finally. The two are not told
      // apart here: to somebody who was never in the room they are one piece of
      // news.
      const room = roomWith({ 'owner-uid': player('Vik') }, NOW.getTime() + 1, status);

      expect(roomAccessFor(room, 'guest-uid', NOW)).toBe('finished');
    },
  );

  it('gives a player of a room somebody ended their own ending back, not a refusal', () => {
    const room = roomWith({ 'owner-uid': player('Vik') }, NOW.getTime() + 1, 'closed');

    expect(roomAccessFor(room, 'owner-uid', NOW)).toBe('joined');
  });

  it('gives a player of a finished room their game back, not a refusal', () => {
    const room = roomWith({ 'owner-uid': player('Vik') }, NOW.getTime() + 1, 'completed');

    expect(roomAccessFor(room, 'owner-uid', NOW)).toBe('joined');
  });

  it('lets a player of a started room back in, which is how reconnecting works', () => {
    const room = roomWith({ 'owner-uid': player('Vik') }, NOW.getTime() + 1, 'playing');

    expect(roomAccessFor(room, 'owner-uid', NOW)).toBe('joined');
  });

  it('closes a room whose lifetime ran out, even to a player already in it', () => {
    const room = roomWith({ 'owner-uid': player('Vik') }, NOW.getTime() - 1);

    expect(roomAccessFor(room, 'owner-uid', NOW)).toBe('expired');
    expect(roomAccessFor(room, 'guest-uid', NOW)).toBe('expired');
  });

  it('counts the moment of expiry as expired', () => {
    const room = roomWith({ 'owner-uid': player('Vik') }, NOW.getTime());

    expect(roomAccessFor(room, 'guest-uid', NOW)).toBe('expired');
  });

  it('does not mistake an inherited object property for a player', () => {
    const room = roomWith({ 'owner-uid': player('Vik') });

    expect(roomAccessFor(room, 'toString', NOW)).toBe('joinable');
  });

  it('lets a newcomer into a full room whose second seat was given up', () => {
    // The defect this ticket exists for: one stray tab of the owner's fills the
    // room, and the friend the link was sent to met a wall for 24 hours.
    const room = roomWith({
      'owner-uid': player('Vik'),
      'ghost-uid': player('Ghost', 1, SEAT_FREE_AFTER_MS + 1000),
    });

    expect(roomAccessFor(room, 'guest-uid', NOW)).toBe('joinable');
  });

  it('keeps a full room shut while its second player is merely away', () => {
    const room = roomWith({
      'owner-uid': player('Vik'),
      'guest-uid': player('Bob', 1, AWAY_AFTER_MS + 1000),
    });

    expect(roomAccessFor(room, 'third-uid', NOW)).toBe('full');
  });
});

describe('hasFreeSeatIn', () => {
  it('has a seat while the lobby holds fewer players than a game is played by', () => {
    expect(hasFreeSeatIn(roomWith({ 'owner-uid': player('Vik') }), NOW)).toBe(true);
  });

  it('has none once both of them are in', () => {
    expect(hasFreeSeatIn(roomWith(bothPlayers), NOW)).toBe(false);
  });

  it('has one again when a guest lets their mark go stale', () => {
    const room = roomWith({
      'owner-uid': player('Vik'),
      'guest-uid': player('Bob', 0, SEAT_FREE_AFTER_MS + 1),
    });

    expect(hasFreeSeatIn(room, NOW)).toBe(true);
  });

  it('has none once the words are dealt out, however few players are in', () => {
    // Every seat of a started game is frozen for the player it was dealt to, so
    // an empty half of the room is not a seat anybody may take.
    const room = roomWith({ 'owner-uid': player('Vik') }, NOW.getTime() + 1, 'playing');

    expect(hasFreeSeatIn(room, NOW)).toBe(false);
  });
});

describe('abandonedSeatIn', () => {
  it('names the seat of a player who stopped marking themselves present', () => {
    const room = roomWith({
      'owner-uid': player('Vik'),
      'ghost-uid': player('Ghost', 1, SEAT_FREE_AFTER_MS + 1000),
    });

    expect(abandonedSeatIn(room, NOW)).toBe('ghost-uid');
  });

  it('holds the seat until the mark is older than the threshold', () => {
    const stillThere = roomWith({
      'owner-uid': player('Vik'),
      'ghost-uid': player('Ghost', 1, SEAT_FREE_AFTER_MS - 1000),
    });
    const given = roomWith({
      'owner-uid': player('Vik'),
      'ghost-uid': player('Ghost', 1, SEAT_FREE_AFTER_MS + 1000),
    });

    expect(abandonedSeatIn(stillThere, NOW)).toBeNull();
    expect(abandonedSeatIn(given, NOW)).toBe('ghost-uid');
  });

  it('never gives up the owner seat, however long they have been gone', () => {
    // They are the likeliest to step out — they are off sending the link — and
    // they alone can start the game, so a room without them has nothing to do.
    const room = roomWith({
      'owner-uid': player('Vik', 0, 10 * SEAT_FREE_AFTER_MS),
      'guest-uid': player('Bob'),
    });

    expect(abandonedSeatIn(room, NOW)).toBeNull();
    expect(roomAccessFor(room, 'third-uid', NOW)).toBe('full');
  });

  it('takes nobody out of a room that still has a seat free', () => {
    const room = roomWith({ 'owner-uid': player('Vik', 0, 10 * SEAT_FREE_AFTER_MS) });

    expect(abandonedSeatIn(room, NOW)).toBeNull();
  });

  it.each(['playing', 'completed', 'closed'] as const)(
    'takes nobody out of a %s room',
    (status) => {
      // Words are dealt to UIDs and the win is read from the same fields, so a
      // player removed mid-game leaves a crossword nobody can ever finish. The
      // security rules refuse the write; this refuses to ask for it.
      const room = roomWith(
        {
          'owner-uid': player('Vik'),
          'ghost-uid': player('Ghost', 1, 10 * SEAT_FREE_AFTER_MS),
        },
        NOW.getTime() + 1,
        status,
      );

      expect(abandonedSeatIn(room, NOW)).toBeNull();
    },
  );
});

describe('playersInJoinOrder', () => {
  it('lists players oldest first, whatever order the map came in', () => {
    const room = roomWith({
      late: player('Late', 300),
      early: player('Early', 100),
      middle: player('Middle', 200),
    });

    expect(playersInJoinOrder(room)).toEqual([
      { id: 'early', nickname: 'Early' },
      { id: 'middle', nickname: 'Middle' },
      { id: 'late', nickname: 'Late' },
    ]);
  });

  it('shows the same order to everyone when two players joined in the same millisecond', () => {
    const room = roomWith({ zoe: player('Zoe', 100), adam: player('Adam', 100) });

    expect(playersInJoinOrder(room).map(({ id }) => id)).toEqual(['adam', 'zoe']);
  });
});

/**
 * A lesson: the owner is its teacher, who is in no entry of `players`, and the
 * two seats are the students'.
 */
const lessonWith = (
  students: Record<string, ReturnType<typeof player>>,
  status: ReadableRoom['status'] = 'lobby',
  expiresAtMillis = NOW.getTime() + 1,
): ReadableRoom => ({
  ...roomWith(students, expiresAtMillis, status),
  mode: 'lesson',
  ownerId: 'teacher-uid',
  teacher: { nickname: 'Carmen', lastSeenAt: at(NOW.getTime()) },
});

describe('roomAccessFor, in a lesson', () => {
  const STUDENT_COUNTS = [0, 1, 2] as const;
  const STATUSES = ['lobby', 'playing', 'completed', 'closed'] as const;

  const studentsOf = (count: (typeof STUDENT_COUNTS)[number]) =>
    Object.fromEntries(['a', 'b'].slice(0, count).map((id) => [id, player(id.toUpperCase())]));

  describe.each(STUDENT_COUNTS)('with %i students in', (count) => {
    it.each(STATUSES)(
      'always lets its teacher into their own room, %s or not: never the join form, never "full", never "started"',
      (status) => {
        const room = lessonWith(studentsOf(count), status);

        expect(roomAccessFor(room, 'teacher-uid', NOW)).toBe('joined');
      },
    );
  });

  it('still turns a teacher away from a room that has expired, like any player', () => {
    const room = lessonWith({}, 'lobby', NOW.getTime());

    expect(roomAccessFor(room, 'teacher-uid', NOW)).toBe('expired');
  });

  it('offers a seat to a student while there is one, with the teacher out of the count', () => {
    expect(roomAccessFor(lessonWith({}), 'newcomer', NOW)).toBe('joinable');
    expect(roomAccessFor(lessonWith(studentsOf(1)), 'newcomer', NOW)).toBe('joinable');
  });

  it('turns a third student away as "full", although only two people are in players', () => {
    expect(roomAccessFor(lessonWith(studentsOf(2)), 'newcomer', NOW)).toBe('full');
  });

  it('turns a student arriving after the deal away as "started"', () => {
    expect(roomAccessFor(lessonWith(studentsOf(2), 'playing'), 'newcomer', NOW)).toBe('started');
  });

  it('lets a student who is in go on playing, and gives the teacher no seat to take', () => {
    expect(roomAccessFor(lessonWith(studentsOf(2), 'playing'), 'a', NOW)).toBe('joined');
    expect(hasFreeSeatIn(lessonWith(studentsOf(2)), NOW)).toBe(false);
  });

  it('frees the seat of a student who left, to the next arrival, but never the teacher’s', () => {
    const gone = { a: player('A', 0, SEAT_FREE_AFTER_MS + 1000), b: player('B') };
    const room = lessonWith(gone);

    expect(abandonedSeatIn(room, NOW)).toBe('a');
    expect(roomAccessFor(room, 'newcomer', NOW)).toBe('joinable');
    expect(abandonedSeatIn(lessonWith({ b: player('B') }), NOW)).toBeNull();
  });

  it('does not make a pair game’s owner a teacher, whatever the mode field says about the room', () => {
    const pair = roomWith({ 'owner-uid': player('Vik') });

    expect(roomAccessFor({ ...pair, mode: 'pair' }, 'owner-uid', NOW)).toBe('joined');
    expect(roomAccessFor(pair, 'someone-else', NOW)).toBe('joinable');
  });
});

describe('ownerNicknameOf', () => {
  it('is the first player’s name in a pair game, written before lessons or after', () => {
    const pair = roomWith({ 'owner-uid': player('Vik') });

    expect(ownerNicknameOf(pair)).toBe('Vik');
    expect(ownerNicknameOf({ ...pair, mode: 'pair' })).toBe('Vik');
  });

  it('is the teacher’s name in a lesson, whose owner is in no entry of players', () => {
    expect(ownerNicknameOf(lessonWith({}))).toBe('Carmen');
  });

  it('is "Somebody" for a room that does not hold the name it should', () => {
    expect(ownerNicknameOf(roomWith({}))).toBe('Somebody');
  });
});
