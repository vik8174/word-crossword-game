import { describe, expect, it } from 'vitest';

import { AWAY_AFTER_MS, SEAT_FREE_AFTER_MS } from './presence';
import {
  abandonedSeatIn,
  type MillisecondTimestamp,
  type ReadableRoom,
  roomAccessFor,
} from './room-access';

/**
 * What happens to the seat of a player who left, in all four cases there are.
 *
 * The policy is one sentence per case, and until this file existed answering
 * any of them meant reading `presence.ts`, `room-access.ts`, `room-screen.ts`
 * and two comments in `firestore.rules`. Written out in
 * `docs/decisions/0025-what-happens-to-the-seat-of-a-player-who-left.md`; here
 * it is asserted, one case per test, so the names alone answer the question.
 *
 * The last two are held by the security rules rather than by this code — once
 * the words are dealt, no key may enter or leave `players` — and the client
 * agreeing is not the same thing as the room refusing. What is actually
 * enforced is proved against the emulator in `firestore/rules.test.mjs`, under
 * the same heading; the pair below say only that the client asks for nothing
 * the rules would have to turn down.
 *
 * Self-contained on purpose, fixture included: a file that answers "what
 * happens if my guest disappears mid-game" is worth nothing if it has to be
 * read against another one.
 */

const NOW = new Date(1_000_000);

const OWNER_ID = 'owner-uid';
const GUEST_ID = 'guest-uid';
/** Somebody arriving at a room that already holds two. */
const NEWCOMER_ID = 'newcomer-uid';

/** Long enough that every threshold presence has is behind us. */
const LONG_GONE_MS = 10 * SEAT_FREE_AFTER_MS;

const at = (millis: number): MillisecondTimestamp => ({ toMillis: () => millis });

/** A player of the room, still marking themselves present unless told otherwise. */
const player = (nickname: string, joinedAtMillis = 0, silentForMs = 0) => ({
  nickname,
  joinedAt: at(joinedAtMillis),
  lastSeenAt: at(NOW.getTime() - silentForMs),
});

/** The room a game is played in: the host, their guest, and a status. */
const roomWith = (guestSilentForMs: number, status: ReadableRoom['status']): ReadableRoom => ({
  status,
  ownerId: OWNER_ID,
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
  words: { w0: { hiddenFromPlayerId: GUEST_ID, guessedByPlayerId: null } },
  players: { [OWNER_ID]: player('Vik'), [GUEST_ID]: player('Bob', 1, guestSilentForMs) },
  createdAt: at(0),
  expiresAt: at(NOW.getTime() + 1),
});

/** The same room, with the host gone quiet instead of the guest. */
const roomWithSilentHost = (hostSilentForMs: number, status: ReadableRoom['status']) => {
  const room = roomWith(0, status);

  return { ...room, players: { ...room.players, [OWNER_ID]: player('Vik', 0, hostSilentForMs) } };
};

describe('the seat of a player who left a lobby', () => {
  it('is kept for the host however long they are gone, and offered to nobody', () => {
    const room = roomWithSilentHost(LONG_GONE_MS, 'lobby');

    expect(abandonedSeatIn(room, NOW)).toBeNull();
    expect(roomAccessFor(room, NEWCOMER_ID, NOW)).toBe('full');
    // And it is still theirs when they come back: no nickname to type again.
    expect(roomAccessFor(room, OWNER_ID, NOW)).toBe('joined');
  });

  it('is given up by a guest once they go quiet, to whoever arrives next', () => {
    const stillTheirs = roomWith(AWAY_AFTER_MS + 1000, 'lobby');
    const nobodys = roomWith(SEAT_FREE_AFTER_MS + 1000, 'lobby');

    // Being shown as away costs a guest nothing — the room is still full.
    expect(abandonedSeatIn(stillTheirs, NOW)).toBeNull();
    expect(roomAccessFor(stillTheirs, NEWCOMER_ID, NOW)).toBe('full');

    expect(abandonedSeatIn(nobodys, NOW)).toBe(GUEST_ID);
    expect(roomAccessFor(nobodys, NEWCOMER_ID, NOW)).toBe('joinable');
  });
});

describe('the seat of a player who left a game that had started', () => {
  it('is frozen for the host, who plays on when they come back', () => {
    const room = roomWithSilentHost(LONG_GONE_MS, 'playing');

    expect(abandonedSeatIn(room, NOW)).toBeNull();
    expect(roomAccessFor(room, OWNER_ID, NOW)).toBe('joined');
  });

  it('is frozen for a guest too, and no newcomer is let into their place', () => {
    // A word is dealt to a UID and the win is read from the same field, so a
    // player taken out of a game leaves a crossword nobody can ever finish.
    const room = roomWith(LONG_GONE_MS, 'playing');

    expect(abandonedSeatIn(room, NOW)).toBeNull();
    expect(roomAccessFor(room, NEWCOMER_ID, NOW)).toBe('started');
    expect(roomAccessFor(room, GUEST_ID, NOW)).toBe('joined');
  });
});
