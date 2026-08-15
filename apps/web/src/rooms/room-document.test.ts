import type { CrosswordLayout } from 'shared';
import { describe, expect, it } from 'vitest';

import {
  buildGuessUpdate,
  buildRoomDocument,
  buildStartGameUpdate,
  parseRoomDocument,
  ROOM_LIFETIME_MS,
  wordIdAt,
} from './room-document';

const CREATED_AT = new Date('2026-01-01T10:00:00.000Z');

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
    expect(players).toEqual({ 'owner-uid': { nickname: 'Vik', joinedAt: CREATED_AT } });
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

describe('buildStartGameUpdate', () => {
  const ASSIGNMENT = ['bob-uid', 'alice-uid', 'bob-uid'];

  it('opens the game for guessing', () => {
    expect(buildStartGameUpdate(ASSIGNMENT).status).toBe('playing');
  });

  it('hides each word from the player the assignment put on it', () => {
    expect(buildStartGameUpdate(ASSIGNMENT)).toMatchObject({
      [`words.${wordIdAt(0)}.hiddenFromPlayerId`]: 'bob-uid',
      [`words.${wordIdAt(1)}.hiddenFromPlayerId`]: 'alice-uid',
      [`words.${wordIdAt(2)}.hiddenFromPlayerId`]: 'bob-uid',
    });
  });

  it('leaves the set of words alone, which is what the security rules insist on', () => {
    // Writing the `words` map itself would replace it wholesale; the rules
    // refuse an update that changes which words a room has, and a player
    // guessing at that moment would lose their write.
    const fields = Object.keys(buildStartGameUpdate(ASSIGNMENT));

    expect(fields).not.toContain('words');
    expect(fields.filter((field) => field !== 'status')).toEqual([
      `words.${wordIdAt(0)}.hiddenFromPlayerId`,
      `words.${wordIdAt(1)}.hiddenFromPlayerId`,
      `words.${wordIdAt(2)}.hiddenFromPlayerId`,
    ]);
  });

  it('touches nothing the room was created with', () => {
    const fields = Object.keys(buildStartGameUpdate(ASSIGNMENT));

    expect(fields).not.toContain('layout');
    expect(fields).not.toContain('ownerId');
    expect(fields).not.toContain('createdAt');
    expect(fields).not.toContain('players');
  });

  it('refuses to start a game nobody was given a word in', () => {
    expect(() => buildStartGameUpdate([])).toThrow(/no word was assigned/i);
  });
});

describe('buildGuessUpdate', () => {
  it('records who answered the word, and touches nothing else', () => {
    expect(buildGuessUpdate(wordIdAt(3), 'bob-uid')).toEqual({
      'words.w3.guessedByPlayerId': 'bob-uid',
    });
  });

  it('leaves the neighbouring words alone, so two players can answer at once', () => {
    // Writing the `words` map itself would replace it wholesale: the rules
    // refuse an update that changes which words a room has, and whoever
    // answered another word in the same second would lose their write.
    const fields = Object.keys(buildGuessUpdate(wordIdAt(0), 'bob-uid'));

    expect(fields).toEqual(['words.w0.guessedByPlayerId']);
  });

  it('leaves finishing the game to the ticket that owns it', () => {
    expect(Object.keys(buildGuessUpdate(wordIdAt(0), 'bob-uid'))).not.toContain('status');
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
    ['no expiry', storedRoom({ expiresAt: '2026-01-01' })],
    ['no birth date', storedRoom({ createdAt: null })],
  ])('refuses %s', (_description, data) => {
    expect(parseRoomDocument(data)).toBeNull();
  });
});
