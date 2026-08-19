import { describe, expect, it } from 'vitest';

import { AWAY_AFTER_MS, SEAT_FREE_AFTER_MS } from './presence';
import {
  abandonedSeatIn,
  type MillisecondTimestamp,
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

  it('tells a newcomer arriving after the game is over that it is over', () => {
    // Turned away either way, but "come back later" would be a lie about a
    // room whose game has already been played to its last word.
    const room = roomWith({ 'owner-uid': player('Vik') }, NOW.getTime() + 1, 'completed');

    expect(roomAccessFor(room, 'guest-uid', NOW)).toBe('finished');
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

  it.each(['playing', 'completed'] as const)('takes nobody out of a %s room', (status) => {
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
  });
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
