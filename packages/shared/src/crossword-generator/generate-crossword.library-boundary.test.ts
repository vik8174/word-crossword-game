import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generateCrossword } from './generate-crossword';

/**
 * The layout library is an unmaintained third party, so `generateCrossword`
 * treats its output as external input rather than trusting it. These tests
 * feed it deliberately broken layouts — the only way to reach that behaviour,
 * since a healthy library never produces them.
 */
vi.mock('crossword-generator-x', () => ({ generateLayout: vi.fn() }));

const { generateLayout } = await import('crossword-generator-x');
const layoutMock = vi.mocked(generateLayout);

const layoutOf = (result: Parameters<typeof layoutMock.mockReturnValue>[0]['result']) => ({
  table: [],
  table_string: '',
  rows: 0,
  cols: 0,
  unplaced: 0,
  result,
});

describe('generateCrossword against a misbehaving layout library', () => {
  beforeEach(() => {
    layoutMock.mockReset();
  });

  it('ignores a placed word that was never asked for', () => {
    layoutMock.mockReturnValue(
      layoutOf([{ answer: 'GHOST', clue: '', orientation: 'across', startx: 1, starty: 1 }]),
    );

    const layout = generateCrossword(['apple']);

    expect(layout.placedWords).toEqual([]);
    expect(layout.unplacedWords).toEqual(['apple']);
  });

  it('ignores a placed word that comes back without coordinates', () => {
    layoutMock.mockReturnValue(layoutOf([{ answer: 'APPLE', clue: '', orientation: 'across' }]));

    const layout = generateCrossword(['apple']);

    expect(layout.placedWords).toEqual([]);
    expect(layout.unplacedWords).toEqual(['apple']);
  });

  it('drops a word whose letters contradict the grid rather than corrupting it', () => {
    layoutMock.mockReturnValue(
      layoutOf([
        { answer: 'APPLE', clue: '', orientation: 'across', startx: 1, starty: 1 },
        // Same row, overlapping APPLE, but spelling different letters into it.
        { answer: 'MELON', clue: '', orientation: 'across', startx: 2, starty: 1 },
      ]),
    );

    const layout = generateCrossword(['apple', 'melon']);

    expect(layout.placedWords.map(({ word }) => word)).toEqual(['apple']);
    expect(layout.unplacedWords).toEqual(['melon']);
    expect(layout.cells.map(({ letter }) => letter).join('')).toBe('APPLE');
  });

  it('keeps a word that overlaps another on matching letters', () => {
    layoutMock.mockReturnValue(
      layoutOf([
        { answer: 'APPLE', clue: '', orientation: 'across', startx: 1, starty: 1 },
        { answer: 'PLUM', clue: '', orientation: 'down', startx: 2, starty: 1 },
      ]),
    );

    const layout = generateCrossword(['apple', 'plum']);

    expect(layout.placedWords.map(({ word }) => word)).toEqual(['apple', 'plum']);
    expect(layout.unplacedWords).toEqual([]);
  });

  it('accounts for repeated words separately', () => {
    layoutMock.mockReturnValue(
      layoutOf([
        { answer: 'APPLE', clue: '', orientation: 'across', startx: 1, starty: 1 },
        { answer: 'APPLE', clue: '', orientation: 'across', startx: 1, starty: 3 },
      ]),
    );

    const layout = generateCrossword(['apple', 'apple']);

    expect(layout.placedWords.map(({ word }) => word)).toEqual(['apple', 'apple']);
    expect(layout.unplacedWords).toEqual([]);
  });
});
