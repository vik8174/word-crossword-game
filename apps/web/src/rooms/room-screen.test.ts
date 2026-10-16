import { describe, expect, it } from 'vitest';

import { SEAT_FREE_AFTER_MS } from './presence';
import type { RoomDocument } from './room-document';
import {
  hasSomebodyToInvite,
  type RoomScreen,
  roomScreenFor,
  screenAfterRefusedJoin,
  screenWhileDealing,
} from './room-screen';
import type { RoomConnection } from './use-room-connection';

const NOW = new Date(1_000_000);

const at = (millis: number) => ({ toMillis: () => millis });

/** A player of the room, still marking themselves present unless told otherwise. */
const player = (nickname: string, joinedAtMillis = 0, silentForMs = 0) => ({
  nickname,
  joinedAt: at(joinedAtMillis),
  lastSeenAt: at(NOW.getTime() - silentForMs),
});

/** Two words, so a room can be half answered as well as full or empty. */
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

const OPEN_WORDS = {
  w0: { hiddenFromPlayerId: 'owner-uid', guessedByPlayerId: null },
  w1: { hiddenFromPlayerId: 'guest-uid', guessedByPlayerId: null },
};

const ANSWERED_WORDS = {
  w0: { hiddenFromPlayerId: 'owner-uid', guessedByPlayerId: 'owner-uid' },
  w1: { hiddenFromPlayerId: 'guest-uid', guessedByPlayerId: 'guest-uid' },
};

interface RoomOptions {
  readonly status?: 'lobby' | 'playing' | 'completed' | 'closed';
  readonly players?: Record<string, ReturnType<typeof player>>;
  readonly words?: Record<string, { hiddenFromPlayerId: string; guessedByPlayerId: string | null }>;
  readonly expiresAtMillis?: number;
}

const roomWith = ({
  status = 'lobby',
  players = { 'owner-uid': player('Vik') },
  words = OPEN_WORDS,
  expiresAtMillis = NOW.getTime() + 1,
}: RoomOptions = {}): RoomDocument =>
  ({
    status,
    ownerId: 'owner-uid',
    layout: LAYOUT,
    words,
    players,
    createdAt: at(0),
    expiresAt: at(expiresAtMillis),
  }) as unknown as RoomDocument;

/** The room as it reaches a viewer who is following it. */
const ready = (room: RoomDocument, playerId = 'guest-uid'): RoomConnection => ({
  status: 'ready',
  playerId,
  room,
});

const bothPlayers = { 'owner-uid': player('Vik'), 'guest-uid': player('Bob', 1) };

/** A room of two the viewer is not one of: for them, both seats are taken. */
const strangersInBothSeats = { 'owner-uid': player('Vik'), 'other-uid': player('Cara', 1) };

describe('roomScreenFor', () => {
  describe('before there is a room to show', () => {
    const cases: readonly [string, RoomConnection, string][] = [
      ['while the visitor is being signed in', { status: 'connecting' }, 'connecting'],
      ['when Firebase could not be reached', { status: 'failed' }, 'unavailable'],
      ['when the link leads nowhere', { status: 'missing' }, 'unavailable'],
    ];

    it.each(cases)('%s', (_name, connection, kind) => {
      expect(roomScreenFor(connection, NOW).kind).toBe(kind);
    });

    it('says which of the two failures it was, rather than only that it failed', () => {
      expect(roomScreenFor({ status: 'failed' }, NOW)).toEqual({
        kind: 'unavailable',
        reason: 'connection',
      });
      expect(roomScreenFor({ status: 'missing' }, NOW)).toEqual({
        kind: 'unavailable',
        reason: 'missing',
      });
    });
  });

  describe('a room the viewer cannot enter', () => {
    const cases: readonly [string, RoomDocument, string][] = [
      [
        'expired, even for a player who is in it',
        roomWith({ players: bothPlayers, expiresAtMillis: NOW.getTime() }),
        'expired',
      ],
      [
        'already playing, for a stranger with the link',
        roomWith({ status: 'playing', players: { 'owner-uid': player('Vik') } }),
        'started',
      ],
      [
        'closed, for a stranger with the link',
        roomWith({
          status: 'completed',
          players: { 'owner-uid': player('Vik') },
          words: ANSWERED_WORDS,
        }),
        'finished',
      ],
      [
        'ended by one of its players, for a stranger with the link',
        roomWith({ status: 'closed', players: { 'owner-uid': player('Vik') } }),
        'finished',
      ],
      ['full, for a third player', roomWith({ players: strangersInBothSeats }), 'full'],
    ];

    it.each(cases)('is unavailable when it is %s', (_name, room, reason) => {
      expect(roomScreenFor(ready(room), NOW)).toEqual({ kind: 'unavailable', reason });
    });
  });

  describe('a room with a free seat', () => {
    it('asks a newcomer for a nickname, and hands over only the name of who invited them', () => {
      expect(roomScreenFor(ready(roomWith()), NOW)).toEqual({
        kind: 'join',
        playerId: 'guest-uid',
        ownerNickname: 'Vik',
        seatToRelease: null,
      });
    });

    it('calls the owner Somebody when the document holds no entry for them', () => {
      const room = roomWith({ players: {} });

      expect(roomScreenFor(ready(room), NOW)).toMatchObject({
        kind: 'join',
        ownerNickname: 'Somebody',
      });
    });

    it('offers the form at a full room whose second seat was given up, and names it', () => {
      const room = roomWith({
        players: {
          'owner-uid': player('Vik'),
          'ghost-uid': player('Ghost', 1, SEAT_FREE_AFTER_MS + 1000),
        },
      });

      expect(roomScreenFor(ready(room), NOW)).toEqual({
        kind: 'join',
        playerId: 'guest-uid',
        ownerNickname: 'Vik',
        seatToRelease: 'ghost-uid',
      });
    });
  });

  describe('a room the viewer is in', () => {
    const cases: readonly [string, RoomDocument, string][] = [
      ['waiting to be started', roomWith({ players: bothPlayers }), 'lobby'],
      ['being played', roomWith({ status: 'playing', players: bothPlayers }), 'playing'],
      [
        'closed with its crossword full',
        roomWith({ status: 'completed', players: bothPlayers, words: ANSWERED_WORDS }),
        'finished',
      ],
      [
        'closed with words still unanswered',
        roomWith({ status: 'completed', players: bothPlayers, words: OPEN_WORDS }),
        'closed-early',
      ],
      [
        'ended by one of its players',
        roomWith({ status: 'closed', players: bothPlayers, words: OPEN_WORDS }),
        'closed-early',
      ],
    ];

    it.each(cases)('shows the %s room', (_name, room, kind) => {
      expect(roomScreenFor(ready(room), NOW)).toEqual({ kind, room, viewerId: 'guest-uid' });
    });

    it('tells a closed room apart by its board, not by the status a client wrote', () => {
      // The security rules cannot walk the `words` map, so `completed` over a
      // game nobody played is a write they accept. Read off the status alone,
      // that room would be celebrated as finished.
      const spoiled = roomWith({ status: 'completed', players: bothPlayers, words: OPEN_WORDS });
      const played = roomWith({ status: 'completed', players: bothPlayers, words: ANSWERED_WORDS });

      expect(roomScreenFor(ready(spoiled), NOW).kind).toBe('closed-early');
      expect(roomScreenFor(ready(played), NOW).kind).toBe('finished');
    });

    it('shows the ending a player wrote without asking the board about it', () => {
      // `closed` is the room saying what happened, and no client can fake a
      // better answer by filling the grid: even the board that came out full —
      // a last answer and an ending landing in the same second — reads as the
      // ending it was written as.
      const ended = roomWith({ status: 'closed', players: bothPlayers, words: OPEN_WORDS });
      const endedOnAFullBoard = roomWith({
        status: 'closed',
        players: bothPlayers,
        words: ANSWERED_WORDS,
      });

      expect(roomScreenFor(ready(ended), NOW).kind).toBe('closed-early');
      expect(roomScreenFor(ready(endedOnAFullBoard), NOW).kind).toBe('closed-early');
    });

    it('names the owner as the viewer when it is the owner reading', () => {
      const room = roomWith({ players: bothPlayers });

      expect(roomScreenFor(ready(room, 'owner-uid'), NOW)).toEqual({
        kind: 'lobby',
        room,
        viewerId: 'owner-uid',
      });
    });
  });

  describe('expiry', () => {
    it('shuts a room the moment it is due, and not a millisecond before', () => {
      const players = bothPlayers;

      expect(
        roomScreenFor(ready(roomWith({ players, expiresAtMillis: NOW.getTime() + 1 })), NOW).kind,
      ).toBe('lobby');
      expect(
        roomScreenFor(ready(roomWith({ players, expiresAtMillis: NOW.getTime() })), NOW),
      ).toEqual({ kind: 'unavailable', reason: 'expired' });
    });
  });
});

describe('screenAfterRefusedJoin', () => {
  const room = roomWith({ players: bothPlayers });
  const viewerId = 'guest-uid';
  const nicknameForm: RoomScreen = {
    kind: 'join',
    playerId: viewerId,
    ownerNickname: 'Vik',
    seatToRelease: null,
  };

  it('takes away the form the refusal proved wrong', () => {
    expect(screenAfterRefusedJoin(nicknameForm, true)).toEqual({
      kind: 'unavailable',
      reason: 'refused',
    });
  });

  it('leaves the form alone until a join is actually refused', () => {
    expect(screenAfterRefusedJoin(nicknameForm, false)).toBe(nicknameForm);
  });

  const others: readonly [string, RoomScreen][] = [
    ['the room has not been read yet', { kind: 'connecting' }],
    ['the room says why it cannot be entered', { kind: 'unavailable', reason: 'full' }],
    ['the player is waiting in the lobby', { kind: 'lobby', room, viewerId }],
    ['the game is on', { kind: 'playing', room, viewerId }],
  ];

  it.each(others)('says nothing about a screen that is not the form when %s', (_name, screen) => {
    // Only the form was offered on the strength of a reading the write
    // disproved; every other screen is derived from a room this player is
    // either in or already shut out of.
    expect(screenAfterRefusedJoin(screen, true)).toBe(screen);
  });
});

describe('hasSomebodyToInvite', () => {
  const ownerId = 'owner-uid';
  const guestId = 'guest-uid';
  const fullRoom = roomWith({ players: bothPlayers });

  /** The same two players, with the guest's mark old enough to free their seat. */
  const roomWithAnAbandonedSeat = roomWith({
    players: {
      'owner-uid': player('Vik'),
      'guest-uid': player('Bob', 1, SEAT_FREE_AFTER_MS + 1),
    },
  });

  it('offers the link to a host who is still waiting alone', () => {
    const lobby: RoomScreen = { kind: 'lobby', room: roomWith(), viewerId: ownerId };

    expect(hasSomebodyToInvite(lobby, NOW)).toBe(true);
  });

  it('takes it away the moment the second seat is filled', () => {
    const lobby: RoomScreen = { kind: 'lobby', room: fullRoom, viewerId: ownerId };

    expect(hasSomebodyToInvite(lobby, NOW)).toBe(false);
  });

  it('gives it back when a seat is freed by a mark that went stale', () => {
    // The room still holds two players, so a count of them would say the host
    // has nobody to invite. The seat is free all the same, and whoever the host
    // sends the link to now gets in.
    const lobby: RoomScreen = { kind: 'lobby', room: roomWithAnAbandonedSeat, viewerId: ownerId };

    expect(hasSomebodyToInvite(lobby, NOW)).toBe(true);
  });

  it('never offers it to a guest, not even in the room whose seat just freed up', () => {
    // The seat that freed up is a guest's own, and it is not theirs to give:
    // the room they are in holds two, and they are one of them.
    const lobby: RoomScreen = { kind: 'lobby', room: roomWithAnAbandonedSeat, viewerId: guestId };

    expect(hasSomebodyToInvite(lobby, NOW)).toBe(false);
  });

  const withoutTheLink: readonly [string, RoomScreen][] = [
    ['nobody has read the room yet', { kind: 'connecting' }],
    [
      'a newcomer is being asked for a nickname',
      { kind: 'join', playerId: guestId, ownerNickname: 'Vik', seatToRelease: null },
    ],
    ['the words are dealt out', { kind: 'playing', room: fullRoom, viewerId: ownerId }],
    ['the crossword is filled in', { kind: 'finished', room: fullRoom, viewerId: ownerId }],
    [
      'the room closed with words open',
      { kind: 'closed-early', room: fullRoom, viewerId: ownerId },
    ],
    ['there is no room at the link', { kind: 'unavailable', reason: 'missing' }],
  ];

  it.each(withoutTheLink)('offers the link to nobody when %s', (_name, screen) => {
    expect(hasSomebodyToInvite(screen, NOW)).toBe(false);
  });

  it('holds the link back until the first snapshot, because a host cannot be recognised without one', () => {
    // The price this ticket accepts: the host sees their link a moment later
    // than they used to, and the guest never sees it at all.
    expect(hasSomebodyToInvite(roomScreenFor({ status: 'connecting' }, NOW), NOW)).toBe(false);
  });
});

/** A lesson: its owner is its teacher, in no entry of `players`, and the seats are the students'. */
const lessonRoom = ({
  students = [],
  status = 'lobby',
  teacherSilentForMs = 0,
}: {
  readonly students?: readonly string[];
  readonly status?: RoomOptions['status'];
  readonly teacherSilentForMs?: number;
} = {}): RoomDocument =>
  ({
    ...roomWith({
      status,
      players: Object.fromEntries(
        students.map((id, index) => [id, player(id.toUpperCase(), index + 1)]),
      ),
      words: status === 'lobby' ? OPEN_WORDS : DEALT_TO_STUDENTS,
    }),
    mode: 'lesson',
    ownerId: 'teacher-uid',
    teacher: { nickname: 'Carmen', lastSeenAt: at(NOW.getTime() - teacherSilentForMs) },
  }) as unknown as RoomDocument;

const DEALT_TO_STUDENTS = {
  w0: { hiddenFromPlayerId: 'a', guessedByPlayerId: null },
  w1: { hiddenFromPlayerId: 'b', guessedByPlayerId: null },
};

describe('roomScreenFor, in a lesson', () => {
  const STUDENT_SETS: readonly (readonly string[])[] = [[], ['a'], ['a', 'b']];

  it.each(STUDENT_SETS.map((students) => [students]))(
    'takes the teacher to the lobby with %j in, and never offers them the join form',
    (students) => {
      const room = lessonRoom({ students });

      expect(roomScreenFor(ready(room, 'teacher-uid'), NOW)).toEqual({
        kind: 'lobby',
        room,
        viewerId: 'teacher-uid',
      });
    },
  );

  it('takes the teacher into the room once the words are dealt', () => {
    const room = lessonRoom({ students: ['a', 'b'], status: 'playing' });

    expect(roomScreenFor(ready(room, 'teacher-uid'), NOW)).toEqual({
      kind: 'playing',
      room,
      viewerId: 'teacher-uid',
    });
  });

  it.each(['completed', 'closed'] as const)(
    'takes the teacher to an end screen of a lesson that is %s, not to the join form or a refusal',
    (status) => {
      const room = lessonRoom({ students: ['a', 'b'], status });

      expect(['finished', 'closed-early']).toContain(
        roomScreenFor(ready(room, 'teacher-uid'), NOW).kind,
      );
    },
  );

  it('offers a student the join form with the teacher on it, and a pair game none', () => {
    const lesson = lessonRoom({ students: ['a'] });
    const screen = roomScreenFor(ready(lesson, 'newcomer'), NOW);

    expect(screen).toEqual({
      kind: 'join',
      playerId: 'newcomer',
      ownerNickname: 'Carmen',
      seatToRelease: null,
      teacher: lesson.teacher,
    });
    expect(roomScreenFor(ready(roomWith(), 'newcomer'), NOW)).not.toHaveProperty('teacher');
  });

  it('names the lesson in the notice of a third student, and one arriving after the deal', () => {
    expect(roomScreenFor(ready(lessonRoom({ students: ['a', 'b'] }), 'newcomer'), NOW)).toEqual({
      kind: 'unavailable',
      reason: 'full',
      mode: 'lesson',
    });
    expect(
      roomScreenFor(
        ready(lessonRoom({ students: ['a', 'b'], status: 'playing' }), 'newcomer'),
        NOW,
      ),
    ).toEqual({ kind: 'unavailable', reason: 'started', mode: 'lesson' });
  });

  it('leaves the mode off the notice of a pair game, which has no wording of its own', () => {
    expect(
      roomScreenFor(ready(roomWith({ players: strangersInBothSeats }), 'newcomer'), NOW),
    ).toEqual({
      kind: 'unavailable',
      reason: 'full',
    });
  });

  it('offers the link to the teacher while a seat is free, with 0 and with 1 student, and not with 2', () => {
    const lobbyOf = (students: readonly string[]): RoomScreen => ({
      kind: 'lobby',
      room: lessonRoom({ students }),
      viewerId: 'teacher-uid',
    });

    expect(hasSomebodyToInvite(lobbyOf([]), NOW)).toBe(true);
    expect(hasSomebodyToInvite(lobbyOf(['a']), NOW)).toBe(true);
    expect(hasSomebodyToInvite(lobbyOf(['a', 'b']), NOW)).toBe(false);
  });

  it('never offers the link to a student', () => {
    const lobby: RoomScreen = {
      kind: 'lobby',
      room: lessonRoom({ students: ['a'] }),
      viewerId: 'a',
    };

    expect(hasSomebodyToInvite(lobby, NOW)).toBe(false);
  });
});

describe('screenWhileDealing', () => {
  const lobbyRoom = roomWith({});
  const playingRoom = roomWith({ status: 'playing' });
  const playing: RoomScreen = { kind: 'playing', room: playingRoom, viewerId: 'owner-uid' };

  it('keeps the lobby the deal was sent from in place of the game that is not confirmed yet', () => {
    expect(screenWhileDealing(playing, lobbyRoom)).toEqual({
      kind: 'lobby',
      room: lobbyRoom,
      viewerId: 'owner-uid',
    });
  });

  it('shows the game as it arrives when no deal is waiting', () => {
    expect(screenWhileDealing(playing, null)).toBe(playing);
  });

  it.each<RoomScreen>([
    { kind: 'lobby', room: lobbyRoom, viewerId: 'owner-uid' },
    { kind: 'finished', room: playingRoom, viewerId: 'owner-uid' },
    { kind: 'closed-early', room: playingRoom, viewerId: 'owner-uid' },
    { kind: 'connecting' },
  ])('passes the $kind screen over, whatever is held', (screen) => {
    expect(screenWhileDealing(screen, lobbyRoom)).toBe(screen);
  });
});
