import type { CrosswordLayout } from 'shared';
import { describe, expect, it } from 'vitest';

import {
  buildRoomDocument,
  buildTeacherPresenceUpdate,
  isTeacherOf,
  parseRoomDocument,
  ROOM_LIFETIME_MS,
  roomModeOf,
} from './room-document';

/**
 * The lesson half of the room document (ADR 0037): a mode, and a teacher who is
 * the owner and is in no entry of `players`. The pair game's half is
 * `room-document.test.ts`, which this file leaves alone.
 */

const CREATED_AT = new Date('2026-01-01T10:00:00.000Z');
const NOW = new Date('2026-01-02T09:00:00.000Z');

const LAYOUT: CrosswordLayout = {
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
};

const build = (mode?: 'pair' | 'lesson') =>
  buildRoomDocument({
    ownerId: 'owner-uid',
    ownerNickname: 'Carmen',
    layout: LAYOUT,
    createdAt: CREATED_AT,
    ...(mode === undefined ? {} : { mode }),
  });

describe('buildRoomDocument, as a lesson', () => {
  it('states its mode', () => {
    expect(build('lesson').mode).toBe('lesson');
  });

  it('puts nobody in players: the owner teaches and does not play', () => {
    expect(build('lesson').players).toEqual({});
  });

  it('records the owner as the teacher, with their nickname and a mark made at creation', () => {
    expect(build('lesson').teacher).toEqual({ nickname: 'Carmen', lastSeenAt: CREATED_AT });
  });

  it('is otherwise the room of a pair game: lobby, words not dealt, 24 hours to live', () => {
    const lesson = build('lesson');

    expect(lesson.status).toBe('lobby');
    expect(lesson.ownerId).toBe('owner-uid');
    expect(lesson.words).toEqual({ w0: { hiddenFromPlayerId: null, guessedByPlayerId: null } });
    expect(lesson.expiresAt.getTime() - CREATED_AT.getTime()).toBe(ROOM_LIFETIME_MS);
  });
});

describe('buildRoomDocument, as a pair game', () => {
  it('is a pair game unless the mode says otherwise, and states it', () => {
    expect(build().mode).toBe('pair');
    expect(build('pair').mode).toBe('pair');
  });

  it('puts the owner in as the first player and records no teacher', () => {
    const pair = build('pair');

    expect(Object.keys(pair.players)).toEqual(['owner-uid']);
    expect(pair).not.toHaveProperty('teacher');
  });
});

describe('buildTeacherPresenceUpdate', () => {
  it('writes the teacher’s mark and the postponed expiry, and nothing else', () => {
    const update = buildTeacherPresenceUpdate(NOW);

    expect(Object.keys(update).sort()).toEqual(['expiresAt', 'teacher.lastSeenAt']);
    expect(update['teacher.lastSeenAt']).toBe(NOW);
    expect((update.expiresAt as Date).getTime() - NOW.getTime()).toBe(ROOM_LIFETIME_MS);
  });
});

describe('roomModeOf and isTeacherOf', () => {
  it('reads a room written before lessons existed as a pair game', () => {
    expect(roomModeOf({})).toBe('pair');
    expect(roomModeOf({ mode: 'pair' })).toBe('pair');
    expect(roomModeOf({ mode: 'lesson' })).toBe('lesson');
  });

  it('calls the owner of a lesson its teacher, and nobody else', () => {
    const lesson = { mode: 'lesson', ownerId: 'owner-uid' } as const;

    expect(isTeacherOf(lesson, 'owner-uid')).toBe(true);
    expect(isTeacherOf(lesson, 'a-student')).toBe(false);
  });

  it('calls the owner of a pair game a player, whether the mode is stated or not', () => {
    expect(isTeacherOf({ ownerId: 'owner-uid' }, 'owner-uid')).toBe(false);
    expect(isTeacherOf({ mode: 'pair', ownerId: 'owner-uid' }, 'owner-uid')).toBe(false);
  });
});

describe('parseRoomDocument, for the mode', () => {
  const stamp = (millis: number) => ({ toMillis: () => millis });

  const stored = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    status: 'lobby',
    ownerId: 'owner-uid',
    layout: LAYOUT,
    words: { w0: { hiddenFromPlayerId: null, guessedByPlayerId: null } },
    players: { 'owner-uid': { nickname: 'Vik', joinedAt: stamp(1) } },
    createdAt: stamp(1),
    expiresAt: stamp(2),
    ...overrides,
  });

  const lesson = (overrides: Record<string, unknown> = {}) =>
    stored({
      mode: 'lesson',
      players: {},
      teacher: { nickname: 'Carmen', lastSeenAt: stamp(1) },
      ...overrides,
    });

  it('reads a room written before lessons existed, with no mode, as a room', () => {
    expect(parseRoomDocument(stored())).not.toBeNull();
    expect(roomModeOf(parseRoomDocument(stored()) ?? {})).toBe('pair');
  });

  it('reads a pair game that states its mode', () => {
    expect(parseRoomDocument(stored({ mode: 'pair' }))).not.toBeNull();
  });

  it('reads a lesson with its teacher', () => {
    expect(parseRoomDocument(lesson())?.teacher?.nickname).toBe('Carmen');
  });

  it('reads a lesson that has students in it', () => {
    const students = { a: { nickname: 'Olena', joinedAt: stamp(2) } };

    expect(Object.keys(parseRoomDocument(lesson({ players: students }))?.players ?? {})).toEqual([
      'a',
    ]);
  });

  it('refuses a mode this app does not know', () => {
    expect(parseRoomDocument(stored({ mode: 'class' }))).toBeNull();
  });

  it.each([
    ['without a teacher', { teacher: undefined }],
    ['with a teacher that has no nickname', { teacher: { lastSeenAt: stamp(1) } }],
    [
      'with a teacher whose nickname is not text',
      { teacher: { nickname: 7, lastSeenAt: stamp(1) } },
    ],
    [
      'with a teacher whose mark is not a time',
      { teacher: { nickname: 'Carmen', lastSeenAt: 'now' } },
    ],
  ])('refuses a lesson %s', (_name, overrides) => {
    expect(parseRoomDocument(lesson(overrides))).toBeNull();
  });

  it('refuses a pair game that carries a teacher, stated or not', () => {
    const teacher = { nickname: 'Carmen', lastSeenAt: stamp(1) };

    expect(parseRoomDocument(stored({ teacher }))).toBeNull();
    expect(parseRoomDocument(stored({ mode: 'pair', teacher }))).toBeNull();
  });
});
