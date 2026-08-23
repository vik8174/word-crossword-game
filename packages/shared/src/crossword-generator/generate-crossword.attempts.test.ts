import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generateCrossword } from './generate-crossword';

/**
 * `generateCrossword` builds several layouts and keeps the best one. The
 * library it builds them with is random, so how many words a run leaves out
 * cannot be predicted — and a test that ran it enough times to be convincing
 * would be flaky. Standing in for the library makes each attempt's outcome a
 * fact of the test, which is the only way to state what "the best one" means.
 */
vi.mock('crossword-generator-x', () => ({ generateLayout: vi.fn() }));

const { generateLayout } = await import('crossword-generator-x');
const layoutMock = vi.mocked(generateLayout);

/**
 * A library result. Its `unplaced` count stays at zero throughout, including
 * for layouts this module then strips a word out of — an attempt is scored by
 * the `CrosswordLayout` it produced, never by what the library claimed.
 */
const layoutOf = (result: Parameters<typeof layoutMock.mockReturnValue>[0]['result']) => ({
  table: [],
  table_string: '',
  rows: 0,
  cols: 0,
  unplaced: 0,
  result,
});

/** A layout holding APPLE and PLUM, crossed on their shared P — nothing left out. */
const bothPlaced = layoutOf([
  { answer: 'APPLE', clue: '', orientation: 'across', startx: 1, starty: 1 },
  { answer: 'PLUM', clue: '', orientation: 'down', startx: 2, starty: 1 },
]);

/** A layout holding APPLE alone — PLUM is left out. */
const appleOnly = layoutOf([
  { answer: 'APPLE', clue: '', orientation: 'across', startx: 1, starty: 1 },
]);

/** A layout holding PLUM alone — as good as `appleOnly`, and a different grid. */
const plumOnly = layoutOf([
  { answer: 'PLUM', clue: '', orientation: 'down', startx: 2, starty: 1 },
]);

describe('generateCrossword choosing between attempts', () => {
  beforeEach(() => {
    layoutMock.mockReset();
  });

  it('returns the attempt that left the fewest words out', () => {
    layoutMock.mockReturnValueOnce(appleOnly).mockReturnValue(bothPlaced);

    const layout = generateCrossword(['apple', 'plum']);

    expect(layout.placedWords.map(({ word }) => word)).toEqual(['apple', 'plum']);
    expect(layout.unplacedWords).toEqual([]);
  });

  it('keeps the earlier attempt when a later one is only as good', () => {
    layoutMock.mockReturnValueOnce(appleOnly).mockReturnValue(plumOnly);

    const layout = generateCrossword(['apple', 'plum']);

    expect(layout.placedWords.map(({ word }) => word)).toEqual(['apple']);
    expect(layout.unplacedWords).toEqual(['plum']);
  });

  it('stops as soon as an attempt places every word', () => {
    layoutMock.mockReturnValue(bothPlaced);

    generateCrossword(['apple', 'plum']);

    expect(layoutMock).toHaveBeenCalledTimes(1);
  });

  it('stops at the first attempt that places every word, not at the tenth', () => {
    layoutMock.mockReturnValueOnce(appleOnly).mockReturnValue(bothPlaced);

    generateCrossword(['apple', 'plum']);

    expect(layoutMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after ten attempts when none of them places every word', () => {
    layoutMock.mockReturnValue(appleOnly);

    const layout = generateCrossword(['apple', 'plum']);

    expect(layoutMock).toHaveBeenCalledTimes(10);
    expect(layout.unplacedWords).toEqual(['plum']);
  });

  it('returns an empty layout when every attempt places nothing', () => {
    layoutMock.mockReturnValue(layoutOf([]));

    const layout = generateCrossword(['apple', 'plum']);

    expect(layoutMock).toHaveBeenCalledTimes(10);
    expect(layout).toEqual({
      rows: 0,
      cols: 0,
      cells: [],
      placedWords: [],
      unplacedWords: ['apple', 'plum'],
    });
  });

  it('stops after an attempt expensive enough to spend the budget on its own', () => {
    // The budget is half a second; this layout takes longer than that to build.
    layoutMock.mockImplementation(() => {
      const until = Date.now() + 600;

      while (Date.now() < until) {
        /* the library is synchronous, and so is the wait for it */
      }

      return appleOnly;
    });

    const layout = generateCrossword(['apple', 'plum']);

    expect(layoutMock).toHaveBeenCalledTimes(1);
    expect(layout.unplacedWords).toEqual(['plum']);
  });

  it('does not touch the library for an empty word list', () => {
    generateCrossword([]);

    expect(layoutMock).not.toHaveBeenCalled();
  });
});
