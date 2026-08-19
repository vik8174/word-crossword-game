import { describe, expect, it } from 'vitest';

import {
  awaitsPresenceFrom,
  AWAY_AFTER_MS,
  awayDurationsIn,
  hasLeftTheSeat,
  isAway,
  SEAT_FREE_AFTER_MS,
  type SeenPlayer,
  silenceLabel,
  silenceOf,
} from './presence';
import type { MillisecondTimestamp, ReadableRoom } from './room-access';

const at = (millis: number): MillisecondTimestamp => ({ toMillis: () => millis });

const SECOND_MS = 1000;

/** The moment every question in this file is asked at. */
const NOW = new Date(10 * 60 * SECOND_MS);

/** A player whose mark is `silenceMs` old, and who joined long before that. */
const silentFor = (silenceMs: number): SeenPlayer => ({
  nickname: 'Bob',
  joinedAt: at(0),
  lastSeenAt: at(NOW.getTime() - silenceMs),
});

const roomWith = (
  players: Record<string, SeenPlayer>,
  status: ReadableRoom['status'] = 'lobby',
): ReadableRoom => ({
  status,
  ownerId: 'owner-uid',
  layout: { rows: 1, cols: 1, cells: [], placedWords: [], unplacedWords: [] },
  words: {},
  players,
  createdAt: at(0),
  expiresAt: at(NOW.getTime() + SECOND_MS),
});

describe('silenceOf', () => {
  it('measures from the mark the player last wrote', () => {
    expect(silenceOf(silentFor(20 * SECOND_MS), NOW)).toBe(20 * SECOND_MS);
  });

  it('measures from the moment they joined when they have never written one', () => {
    // A room created before presence existed. Treating a missing mark as "never
    // seen" would show its players as away on the strength of a field no client
    // of that room was writing yet.
    const player: SeenPlayer = { nickname: 'Vik', joinedAt: at(NOW.getTime() - 30 * SECOND_MS) };

    expect(silenceOf(player, NOW)).toBe(30 * SECOND_MS);
  });
});

describe('isAway', () => {
  it('leaves a player alone until their mark is older than the threshold', () => {
    expect(isAway(silentFor(AWAY_AFTER_MS - SECOND_MS), NOW)).toBe(false);
  });

  it('says a player is away once their mark is older than it', () => {
    expect(isAway(silentFor(AWAY_AFTER_MS + SECOND_MS), NOW)).toBe(true);
  });

  it('takes the line back the moment they write again', () => {
    expect(isAway(silentFor(0), NOW)).toBe(false);
  });
});

describe('hasLeftTheSeat', () => {
  it('holds the seat for a player who is only away', () => {
    // The two thresholds are what keep the fast reaction from causing the
    // irreversible one: a name can be marked away and still be sitting there.
    expect(isAway(silentFor(SEAT_FREE_AFTER_MS - SECOND_MS), NOW)).toBe(true);
    expect(hasLeftTheSeat(silentFor(SEAT_FREE_AFTER_MS - SECOND_MS), NOW)).toBe(false);
  });

  it('gives the seat up once the mark is older than the second threshold', () => {
    expect(hasLeftTheSeat(silentFor(SEAT_FREE_AFTER_MS + SECOND_MS), NOW)).toBe(true);
  });
});

describe('silenceLabel', () => {
  it('says how long it has been, in the unit a person waiting would use', () => {
    expect(silenceLabel(50 * SECOND_MS)).toBe('under a minute');
    expect(silenceLabel(60 * SECOND_MS)).toBe('1 min');
    expect(silenceLabel(125 * SECOND_MS)).toBe('2 min');
    expect(silenceLabel(3 * 60 * 60 * SECOND_MS)).toBe('3 h');
  });

  it('never claims more silence than there has been', () => {
    expect(silenceLabel(119 * SECOND_MS)).toBe('1 min');
    expect(silenceLabel(119 * 60 * SECOND_MS)).toBe('1 h');
  });
});

describe('awayDurationsIn', () => {
  it('says how long the away players have been away, and nothing of the others', () => {
    const room = roomWith({
      present: silentFor(0),
      gone: silentFor(125 * SECOND_MS),
    });

    expect(awayDurationsIn(room, NOW)).toEqual({ gone: '2 min' });
  });

  it('says nothing at all about a room everybody is still in', () => {
    expect(awayDurationsIn(roomWith({ present: silentFor(0) }), NOW)).toEqual({});
  });
});

describe('awaitsPresenceFrom', () => {
  const player = silentFor(0);

  it('wants a mark from a player of a room that is waiting or being played', () => {
    expect(awaitsPresenceFrom(roomWith({ bob: player }), 'bob')).toBe(true);
    expect(awaitsPresenceFrom(roomWith({ bob: player }, 'playing'), 'bob')).toBe(true);
  });

  it('wants nothing from a visitor who has not joined the room', () => {
    expect(awaitsPresenceFrom(roomWith({ bob: player }), 'stranger-uid')).toBe(false);
  });

  it('wants nothing once the game is over', () => {
    // Nobody is waiting on anybody in a finished room, and every write pushes
    // its expiry another 24 hours out — a tab left on the final screen would
    // keep the room alive for good.
    expect(awaitsPresenceFrom(roomWith({ bob: player }, 'completed'), 'bob')).toBe(false);
  });
});
