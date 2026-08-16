import { describe, expect, it } from 'vitest';

import type { MillisecondTimestamp, ReadableRoom } from './room-access';
import {
  awaitsCompletion,
  buildCompletionUpdate,
  isEveryWordGuessed,
  isGameFinished,
} from './room-completion';
import { ROOM_LIFETIME_MS, type RoomStatus, type RoomWordState } from './room-document';

const at = (millis: number): MillisecondTimestamp => ({ toMillis: () => millis });

const placed = (word: string) => ({
  word,
  orientation: 'across' as const,
  cells: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
  ],
});

/** A room of as many words as the given states, in whatever state they are in. */
const roomWith = (
  words: Readonly<Record<string, Partial<RoomWordState>>>,
  status: RoomStatus = 'playing',
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
    placedWords: Object.keys(words).map((id) => placed(id)),
    unplacedWords: [],
  },
  words: Object.fromEntries(
    Object.values(words).map((state, index) => [
      `w${index}`,
      { hiddenFromPlayerId: 'owner-uid', guessedByPlayerId: null, ...state },
    ]),
  ),
  players: { 'owner-uid': { nickname: 'Vik', joinedAt: at(0) } },
  createdAt: at(0),
  expiresAt: at(1_000_000),
});

const guessedBy = (playerId: string) => ({ guessedByPlayerId: playerId });
const unguessed = {};

describe('isEveryWordGuessed', () => {
  it('is true once every word of the crossword names who answered it', () => {
    const room = roomWith({ cat: guessedBy('owner-uid'), dog: guessedBy('guest-uid') });

    expect(isEveryWordGuessed(room)).toBe(true);
  });

  it('is false while one word is still open', () => {
    const room = roomWith({ cat: guessedBy('owner-uid'), dog: unguessed });

    expect(isEveryWordGuessed(room)).toBe(false);
  });

  it('does not count a word whose state another client wrote nonsense into', () => {
    // The security rules do not look inside the `words` map, so an empty string
    // can be written there — and an unanswered word must not read as answered.
    const room = roomWith({ cat: guessedBy('owner-uid'), dog: { guessedByPlayerId: '' } });

    expect(isEveryWordGuessed(room)).toBe(false);
  });

  it('does not count a word the document has no state for at all', () => {
    const room = roomWith({ cat: guessedBy('owner-uid') });
    const withExtraWord: ReadableRoom = {
      ...room,
      layout: { ...room.layout, placedWords: [...room.layout.placedWords, placed('dog')] },
    };

    expect(isEveryWordGuessed(withExtraWord)).toBe(false);
  });
});

describe('awaitsCompletion', () => {
  it('asks for the game to be closed the moment the board shows every word answered', () => {
    const room = roomWith({ cat: guessedBy('owner-uid'), dog: guessedBy('guest-uid') });

    expect(awaitsCompletion(room)).toBe(true);
  });

  it('asks for nothing while a word is still open', () => {
    expect(awaitsCompletion(roomWith({ cat: guessedBy('owner-uid'), dog: unguessed }))).toBe(false);
  });

  it('asks for nothing once the room already says the game is over', () => {
    // Otherwise every client would rewrite the same status on every snapshot.
    const room = roomWith({ cat: guessedBy('owner-uid') }, 'completed');

    expect(awaitsCompletion(room)).toBe(false);
  });

  it('asks for nothing in a lobby, where no word has been dealt out yet', () => {
    const room = roomWith({ cat: guessedBy('owner-uid') }, 'lobby');

    expect(awaitsCompletion(room)).toBe(false);
  });

  it('does not care which player answered which word', () => {
    // The board is the whole question. Who was last to answer — the thing a
    // client cannot know about a room two people are writing to at once — is
    // asked nowhere here.
    const byOne = roomWith({ cat: guessedBy('owner-uid'), dog: guessedBy('owner-uid') });
    const byBoth = roomWith({ cat: guessedBy('owner-uid'), dog: guessedBy('guest-uid') });

    expect(awaitsCompletion(byOne)).toBe(awaitsCompletion(byBoth));
  });
});

describe('isGameFinished', () => {
  it('is true for a closed room whose every word was answered', () => {
    const room = roomWith(
      { cat: guessedBy('owner-uid'), dog: guessedBy('guest-uid') },
      'completed',
    );

    expect(isGameFinished(room)).toBe(true);
  });

  it('does not take a closed status as proof the crossword was played', () => {
    // The rules cannot walk the `words` map, so any client that knows the room
    // id can write `completed` over a game nobody has answered a word of. What
    // is shown on the strength of this must not follow that field alone.
    const room = roomWith({ cat: unguessed, dog: unguessed }, 'completed');

    expect(isGameFinished(room)).toBe(false);
  });

  it('is false for a full board that has not been closed yet', () => {
    const room = roomWith({ cat: guessedBy('owner-uid'), dog: guessedBy('guest-uid') }, 'playing');

    expect(isGameFinished(room)).toBe(false);
  });

  it('is false for a lobby somebody closed without dealing a single word', () => {
    const room = roomWith({ cat: unguessed }, 'completed');

    expect(isGameFinished(room)).toBe(false);
  });
});

describe('buildCompletionUpdate', () => {
  const CLOSED_AT = new Date('2026-01-02T09:00:00.000Z');

  it('writes the finished status and nothing else about the game', () => {
    expect(buildCompletionUpdate(CLOSED_AT)).toMatchObject({ status: 'completed' });
    expect(
      Object.keys(buildCompletionUpdate(CLOSED_AT)).filter((key) => key !== 'expiresAt'),
    ).toEqual(['status']);
  });

  it('keeps the finished room alive long enough to be read back', () => {
    // A finished game is still opened by its players — and by the rules'
    // reckoning a room past its expiry refuses every write, so closing one
    // without postponing it would be the last write it ever took.
    expect(buildCompletionUpdate(CLOSED_AT).expiresAt).toEqual(
      new Date(CLOSED_AT.getTime() + ROOM_LIFETIME_MS),
    );
  });
});
