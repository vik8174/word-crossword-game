import { describe, expect, it } from 'vitest';

import type { RoomDocument } from './room-document';
import { roomScreenFor } from './room-screen';
import type { RoomConnection } from './use-room-connection';

const NOW = new Date(1_000_000);

const at = (millis: number) => ({ toMillis: () => millis });

const player = (nickname: string, joinedAtMillis = 0) => ({
  nickname,
  joinedAt: at(joinedAtMillis),
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
  readonly status?: 'lobby' | 'playing' | 'completed';
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

const fourPlayers = Object.fromEntries(
  ['a', 'b', 'c', 'd'].map((id, index) => [id, player(id.toUpperCase(), index)]),
);

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
      ['full, for a fifth player', roomWith({ players: fourPlayers }), 'full'],
    ];

    it.each(cases)('is unavailable when it is %s', (_name, room, reason) => {
      expect(roomScreenFor(ready(room), NOW)).toEqual({ kind: 'unavailable', reason });
    });
  });

  describe('a room with a free seat', () => {
    it('asks a newcomer for a nickname, and hands over nothing of the room', () => {
      expect(roomScreenFor(ready(roomWith()), NOW)).toEqual({
        kind: 'join',
        playerId: 'guest-uid',
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
