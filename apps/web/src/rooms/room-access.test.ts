import { describe, expect, it } from 'vitest';

import {
  type MillisecondTimestamp,
  playersInJoinOrder,
  type ReadableRoom,
  roomAccessFor,
} from './room-access';

const at = (millis: number): MillisecondTimestamp => ({ toMillis: () => millis });

const NOW = new Date(1_000_000);

const player = (nickname: string, joinedAtMillis = 0) => ({
  nickname,
  joinedAt: at(joinedAtMillis),
});

const roomWith = (
  players: Record<string, { nickname: string; joinedAt: MillisecondTimestamp }>,
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
