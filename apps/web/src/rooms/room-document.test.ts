import type { CrosswordLayout } from 'shared';
import { describe, expect, it } from 'vitest';

import {
  buildGuessUpdate,
  buildJoinUpdate,
  buildPresenceUpdate,
  buildRoomDocument,
  buildRoomUpdate,
  buildStartGameUpdate,
  parseRoomDocument,
  ROOM_LIFETIME_MS,
  wordIdAt,
} from './room-document';

const CREATED_AT = new Date('2026-01-01T10:00:00.000Z');

/** The moment every update in this file is made at. */
const NOW = new Date('2026-01-02T09:00:00.000Z');

/** How far into the future an update pushed the room's expiry. */
const expiryOf = (update: Readonly<Record<string, unknown>>) => {
  const expiresAt = update.expiresAt;

  if (!(expiresAt instanceof Date)) {
    throw new Error(`This update carries no expiry: ${JSON.stringify(update)}`);
  }

  return expiresAt.getTime() - NOW.getTime();
};

/** Two crossing words, one word the generator could not place. */
const LAYOUT: CrosswordLayout = {
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
      word: 'Car',
      orientation: 'down',
      cells: [
        { row: 0, col: 0 },
        { row: 1, col: 0 },
        { row: 2, col: 0 },
      ],
    },
  ],
  unplacedWords: ['zebra'],
};

const buildDocument = (layout: CrosswordLayout = LAYOUT) =>
  buildRoomDocument({
    ownerId: 'owner-uid',
    ownerNickname: 'Vik',
    layout,
    createdAt: CREATED_AT,
  });

describe('buildRoomDocument', () => {
  it('opens the room in the lobby, waiting for players', () => {
    expect(buildDocument().status).toBe('lobby');
  });

  it('puts the owner in the room as its first player', () => {
    const { ownerId, players } = buildDocument();

    expect(ownerId).toBe('owner-uid');
    expect(players).toEqual({
      'owner-uid': { nickname: 'Vik', joinedAt: CREATED_AT, lastSeenAt: CREATED_AT },
    });
  });

  it('stores the layout exactly as the generator produced it', () => {
    expect(buildDocument().layout).toEqual(LAYOUT);
  });

  it('tracks one word entry per placed word, keyed by its position in the layout', () => {
    expect(Object.keys(buildDocument().words)).toEqual([wordIdAt(0), wordIdAt(1)]);
  });

  it('leaves every word unassigned and unguessed', () => {
    expect(Object.values(buildDocument().words)).toEqual([
      { hiddenFromPlayerId: null, guessedByPlayerId: null },
      { hiddenFromPlayerId: null, guessedByPlayerId: null },
    ]);
  });

  it('keeps no word state for words that did not fit into the grid', () => {
    expect(Object.keys(buildDocument().words)).toHaveLength(LAYOUT.placedWords.length);
  });

  it('expires 24 hours after creation, for the Firestore TTL policy to collect', () => {
    const { createdAt, expiresAt } = buildDocument();

    expect(createdAt).toEqual(CREATED_AT);
    expect(expiresAt.getTime() - createdAt.getTime()).toBe(ROOM_LIFETIME_MS);
  });

  it('refuses to build a room out of a layout where nothing was placed', () => {
    const emptyLayout: CrosswordLayout = {
      rows: 0,
      cols: 0,
      cells: [],
      placedWords: [],
      unplacedWords: ['abc', 'def'],
    };

    expect(() => buildDocument(emptyLayout)).toThrow(/no placed words/i);
  });
});

describe('buildRoomUpdate', () => {
  it('writes the fields it was given', () => {
    expect(buildRoomUpdate({ status: 'completed' }, NOW)).toMatchObject({ status: 'completed' });
  });

  it('gives the room another full lifetime from the moment of the write', () => {
    expect(expiryOf(buildRoomUpdate({ status: 'completed' }, NOW))).toBe(ROOM_LIFETIME_MS);
  });

  it('measures that lifetime from now, not from when the room was created', () => {
    const later = new Date(NOW.getTime() + ROOM_LIFETIME_MS);
    const expiresAt = buildRoomUpdate({}, later).expiresAt;

    expect(expiresAt).toEqual(new Date(later.getTime() + ROOM_LIFETIME_MS));
  });

  it('refuses to let a caller decide the expiry itself', () => {
    // A write that sets its own `expiresAt` is a room whose life no longer
    // follows from being played, which is the one thing this must not allow.
    const forged = new Date('2020-01-01T00:00:00.000Z');

    expect(expiryOf(buildRoomUpdate({ expiresAt: forged }, NOW))).toBe(ROOM_LIFETIME_MS);
  });
});

describe('buildJoinUpdate', () => {
  const join = () => buildJoinUpdate('bob-uid', 'Bob', NOW);

  it('adds only the joining player, leaving everyone else in place', () => {
    // Writing the `players` map itself would replace it wholesale, and two
    // players arriving in the same second would lose one of the two entries.
    expect(join()).toMatchObject({
      'players.bob-uid': { nickname: 'Bob', joinedAt: NOW, lastSeenAt: NOW },
    });
    expect(Object.keys(join())).not.toContain('players');
  });

  it('marks the player present as they arrive, so nobody reads them as away', () => {
    // Their first heartbeat is a moment away, and until it lands the room would
    // date them from a field they do not have.
    expect(join()).toMatchObject({ 'players.bob-uid': { lastSeenAt: NOW } });
  });

  it('keeps the room alive, because arriving is playing', () => {
    expect(expiryOf(join())).toBe(ROOM_LIFETIME_MS);
  });
});

describe('buildPresenceUpdate', () => {
  const mark = () => buildPresenceUpdate('bob-uid', NOW);

  it('writes the mark and nothing else about the player', () => {
    // Not `players.bob-uid`: rewriting the entry would rewrite `joinedAt` with
    // it, and the player list is ordered by that value — a mark written every
    // fifteen seconds would shuffle the list on every beat.
    expect(Object.keys(mark()).filter((field) => field !== 'expiresAt')).toEqual([
      'players.bob-uid.lastSeenAt',
    ]);
    expect(mark()).toMatchObject({ 'players.bob-uid.lastSeenAt': NOW });
  });

  it('keeps the room alive, because somebody sitting in it is somebody using it', () => {
    expect(expiryOf(mark())).toBe(ROOM_LIFETIME_MS);
  });
});

describe('buildStartGameUpdate', () => {
  const ASSIGNMENT = ['bob-uid', 'alice-uid', 'bob-uid'];
  const startGame = () => buildStartGameUpdate(ASSIGNMENT, NOW);

  it('opens the game for guessing', () => {
    expect(startGame().status).toBe('playing');
  });

  it('hides each word from the player the assignment put on it', () => {
    expect(startGame()).toMatchObject({
      [`words.${wordIdAt(0)}.hiddenFromPlayerId`]: 'bob-uid',
      [`words.${wordIdAt(1)}.hiddenFromPlayerId`]: 'alice-uid',
      [`words.${wordIdAt(2)}.hiddenFromPlayerId`]: 'bob-uid',
    });
  });

  it('leaves the set of words alone, which is what the security rules insist on', () => {
    // Writing the `words` map itself would replace it wholesale; the rules
    // refuse an update that changes which words a room has, and a player
    // guessing at that moment would lose their write.
    const fields = Object.keys(startGame());

    expect(fields).not.toContain('words');
    expect(fields.filter((field) => field !== 'status' && field !== 'expiresAt')).toEqual([
      `words.${wordIdAt(0)}.hiddenFromPlayerId`,
      `words.${wordIdAt(1)}.hiddenFromPlayerId`,
      `words.${wordIdAt(2)}.hiddenFromPlayerId`,
    ]);
  });

  it('touches nothing the room was created with', () => {
    const fields = Object.keys(startGame());

    expect(fields).not.toContain('layout');
    expect(fields).not.toContain('ownerId');
    expect(fields).not.toContain('createdAt');
    expect(fields).not.toContain('players');
  });

  it('keeps the room alive, because starting is playing', () => {
    expect(expiryOf(startGame())).toBe(ROOM_LIFETIME_MS);
  });

  it('refuses to start a game nobody was given a word in', () => {
    expect(() => buildStartGameUpdate([], NOW)).toThrow(/no word was assigned/i);
  });
});

describe('buildGuessUpdate', () => {
  const guess = (index = 3) => buildGuessUpdate(wordIdAt(index), 'bob-uid', NOW);

  it('records who answered the word, and touches nothing else', () => {
    expect(guess()).toMatchObject({ 'words.w3.guessedByPlayerId': 'bob-uid' });
  });

  it('leaves the neighbouring words alone, so two players can answer at once', () => {
    // Writing the `words` map itself would replace it wholesale: the rules
    // refuse an update that changes which words a room has, and whoever
    // answered another word in the same second would lose their write.
    const fields = Object.keys(guess(0));

    expect(fields.filter((field) => field !== 'expiresAt')).toEqual(['words.w0.guessedByPlayerId']);
  });

  it('keeps the room alive, because answering is playing', () => {
    expect(expiryOf(guess(0))).toBe(ROOM_LIFETIME_MS);
  });

  it('leaves finishing the game to the ticket that owns it', () => {
    expect(Object.keys(guess(0))).not.toContain('status');
  });
});

/** A timestamp as the Firestore SDK hands one back. */
const timestamp = (millis: number) => ({ toMillis: () => millis, seconds: millis / 1000 });

/** A stored room, as `snapshot.data()` would return it. */
const storedRoom = (overrides: Record<string, unknown> = {}) => ({
  status: 'lobby',
  ownerId: 'owner-uid',
  layout: LAYOUT,
  words: { w0: { hiddenFromPlayerId: null, guessedByPlayerId: null } },
  players: { 'owner-uid': { nickname: 'Vik', joinedAt: timestamp(1000) } },
  createdAt: timestamp(1000),
  expiresAt: timestamp(2000),
  ...overrides,
});

describe('parseRoomDocument', () => {
  it('accepts a room written by this app', () => {
    const stored = storedRoom();

    expect(parseRoomDocument(stored)).toBe(stored);
  });

  it('accepts a room in any of the three states a game goes through', () => {
    for (const status of ['lobby', 'playing', 'completed']) {
      expect(parseRoomDocument(storedRoom({ status }))).not.toBeNull();
    }
  });

  it.each([
    ['nothing at all', undefined],
    ['a value that is not an object', 'room-1'],
    ['an array', []],
    ['a status the game does not know', storedRoom({ status: 'paused' })],
    ['no owner', storedRoom({ ownerId: 42 })],
    ['no grid to play on', storedRoom({ layout: { rows: 1, cols: 1 } })],
    ['words that are not a map', storedRoom({ words: [] })],
    ['players that are not a map', storedRoom({ players: null })],
    [
      'a player whose nickname is not text',
      storedRoom({ players: { a: { nickname: { evil: 1 } } } }),
    ],
    [
      'a player who joined at no time',
      storedRoom({ players: { a: { nickname: 'A', joinedAt: 5 } } }),
    ],
    [
      'a player whose mark is not a moment',
      storedRoom({ players: { a: { nickname: 'A', joinedAt: timestamp(1), lastSeenAt: 'now' } } }),
    ],
    ['no expiry', storedRoom({ expiresAt: '2026-01-01' })],
    ['no birth date', storedRoom({ createdAt: null })],
  ])('refuses %s', (_description, data) => {
    expect(parseRoomDocument(data)).toBeNull();
  });

  it('accepts a room whose players were written before presence existed', () => {
    // Rooms live for 24 hours, so some of them outlive the deploy that added
    // the field. Refusing those would take a game away mid-word from players
    // who did nothing but keep playing it.
    const stored = storedRoom({
      players: { 'owner-uid': { nickname: 'Vik', joinedAt: timestamp(1000) } },
    });

    expect(parseRoomDocument(stored)).toBe(stored);
  });

  it('accepts a player who has marked themselves present', () => {
    const stored = storedRoom({
      players: {
        'owner-uid': { nickname: 'Vik', joinedAt: timestamp(1000), lastSeenAt: timestamp(9000) },
      },
    });

    expect(parseRoomDocument(stored)).toBe(stored);
  });
});
