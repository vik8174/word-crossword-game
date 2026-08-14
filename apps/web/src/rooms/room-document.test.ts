import type { CrosswordLayout } from 'shared';
import { describe, expect, it } from 'vitest';

import { buildRoomDocument, ROOM_LIFETIME_MS, wordIdAt } from './room-document';

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
