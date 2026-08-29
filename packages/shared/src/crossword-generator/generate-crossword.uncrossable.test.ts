import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generateCrossword } from './generate-crossword';

/**
 * A word sharing no letter with any other word in the list cannot cross
 * anything, and the library only reaches that conclusion by exhausting a grid
 * three times the longest word — seconds, inside the owner's click on "Create
 * room". `generateCrossword` answers for such a word itself.
 *
 * What the answer must be is unchanged, so most of it is asserted against the
 * real library elsewhere; what is asserted here is that the library is not the
 * one being asked, which only standing in for it can show.
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

/** A layout holding APPLE and PLUM, crossed on their shared P. */
const applePlum = layoutOf([
  { answer: 'APPLE', clue: '', orientation: 'across', startx: 1, starty: 1 },
  { answer: 'PLUM', clue: '', orientation: 'down', startx: 2, starty: 1 },
]);

/** The words a call handed the library, in the order it handed them over. */
const wordsGivenToLibrary = (call: number): readonly string[] =>
  layoutMock.mock.calls[call][0].map(({ answer }) => answer);

describe('generateCrossword with a word that has nothing to cross', () => {
  beforeEach(() => {
    layoutMock.mockReset();
    layoutMock.mockReturnValue(applePlum);
  });

  it('keeps the word out of the library', () => {
    generateCrossword(['apple', 'plum', 'jjj']);

    expect(wordsGivenToLibrary(0)).toEqual(['apple', 'plum']);
  });

  it('reports it unplaced, in the position it was passed in at', () => {
    const layout = generateCrossword(['jjj', 'apple', 'plum']);

    expect(layout.unplacedWords).toEqual(['jjj']);
    expect(layout.placedWords.map(({ word }) => word)).toEqual(['apple', 'plum']);
  });

  it('does not repeat the layout for a word no attempt could place', () => {
    generateCrossword(['apple', 'plum', 'jjj']);

    expect(layoutMock).toHaveBeenCalledTimes(1);
  });

  it('does not touch the library when no word in the list can cross', () => {
    const words = ['abc', 'def', 'ghi'];
    const layout = generateCrossword(words);

    expect(layoutMock).not.toHaveBeenCalled();
    expect(layout).toEqual({
      rows: 0,
      cols: 0,
      cells: [],
      placedWords: [],
      unplacedWords: words,
    });
  });

  it('judges a word by the list it is in, not by how unlikely its letters look', () => {
    generateCrossword(['characterization', 'zzz']);

    expect(wordsGivenToLibrary(0)).toEqual(['characterization', 'zzz']);
  });

  it('counts a word that shares a letter with a repetition of itself', () => {
    generateCrossword(['jjj', 'jjj']);

    expect(wordsGivenToLibrary(0)).toEqual(['jjj', 'jjj']);
  });

  it('leaves a pair that can only cross each other to the library', () => {
    // Neither shares a letter with apple or plum, so neither can join their
    // grid — but they share a Z with each other, which letters alone cannot
    // tell apart from a crossing that would work.
    generateCrossword(['apple', 'plum', 'xyz', 'zbd']);

    expect(wordsGivenToLibrary(0)).toEqual(['apple', 'plum', 'xyz', 'zbd']);
  });
});
