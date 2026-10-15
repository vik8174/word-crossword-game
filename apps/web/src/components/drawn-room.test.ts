import { describe, expect, it } from 'vitest';

import { type DrawnWord, gameRoom } from './drawn-room';

/** The letters of a room's grid, as the squares hold them, left to right. */
const lettersOf = (words: readonly DrawnWord[]): string =>
  gameRoom(words, 3, 7)
    .layout.cells.map(({ letter }) => letter)
    .join('');

describe('the workshop draws each square as the grid does', () => {
  it('upper-cases a word and keeps its accents', () => {
    expect(
      lettersOf([{ row: 0, col: 0, orientation: 'across', word: 'łódź', explainedBy: 'viewer' }]),
    ).toBe('ŁÓDŹ');
  });

  it('puts ß on its one square as ẞ, never SS in one square', () => {
    const room = gameRoom(
      [{ row: 0, col: 0, orientation: 'across', word: 'straße', explainedBy: 'viewer' }],
      1,
      6,
    );

    expect(room.layout.cells.map(({ letter }) => letter)).toEqual(['S', 'T', 'R', 'A', 'ẞ', 'E']);
    expect(room.layout.cells.every(({ letter }) => letter.length === 1)).toBe(true);
  });

  it('keeps the word as it was written, and does not draw the comparison key', () => {
    const room = gameRoom(
      [{ row: 0, col: 0, orientation: 'across', word: 'ősz', explainedBy: 'other' }],
      1,
      3,
    );

    expect(room.layout.placedWords[0]?.word).toBe('ősz');
    expect(room.layout.cells.map(({ letter }) => letter).join('')).toBe('ŐSZ');
  });
});
