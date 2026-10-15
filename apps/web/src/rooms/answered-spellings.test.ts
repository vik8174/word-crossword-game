import { describe, expect, it } from 'vitest';

import { answeredSpellings } from './answered-spellings';
import type { GridCellView, GridView, GuessableWord } from './word-visibility';

const solved = (row: number, col: number, letter: string): GridCellView => ({
  row,
  col,
  number: null,
  content: { kind: 'solved', letter },
});

const empty = (row: number, col: number): GridCellView => ({
  row,
  col,
  number: null,
  content: { kind: 'empty' },
});

const word = (id: string, cols: readonly number[], isSolved: boolean): GuessableWord => ({
  id,
  number: 1,
  orientation: 'across',
  cells: cols.map((col) => ({ row: 0, col })),
  isSolved,
  accepts: () => false,
});

const viewOf = (cells: readonly GridCellView[]): GridView => ({
  rows: 1,
  cols: 6,
  cells,
  toGuess: [],
});

describe('answeredSpellings', () => {
  it('spells an answered word from the letters the board shows for it', () => {
    const view = viewOf([solved(0, 0, 'C'), solved(0, 1, 'A'), solved(0, 2, 'T')]);

    expect(answeredSpellings(view, [word('w1', [0, 1, 2], true)]).get('w1')).toBe('CAT');
  });

  it('has no spelling for a word that is still open, whatever the board shows of it', () => {
    const view = viewOf([solved(0, 0, 'C'), solved(0, 1, 'A'), solved(0, 2, 'T')]);

    expect(answeredSpellings(view, [word('w1', [0, 1, 2], false)]).has('w1')).toBe(false);
  });

  it('has no spelling for a word with a square the board does not show', () => {
    // A word the room calls answered whose letters have not all arrived is shown
    // as its blanks and not as half a word.
    const view = viewOf([solved(0, 0, 'C'), empty(0, 1), solved(0, 2, 'T')]);

    expect(answeredSpellings(view, [word('w1', [0, 1, 2], true)]).has('w1')).toBe(false);
  });

  it('spells each answered word on its own', () => {
    const view = viewOf([
      solved(0, 0, 'C'),
      solved(0, 1, 'A'),
      solved(0, 2, 'T'),
      solved(0, 3, 'D'),
      solved(0, 4, 'O'),
      solved(0, 5, 'G'),
    ]);
    const spellings = answeredSpellings(view, [
      word('w1', [0, 1, 2], true),
      word('w2', [3, 4, 5], true),
    ]);

    expect([...spellings]).toEqual([
      ['w1', 'CAT'],
      ['w2', 'DOG'],
    ]);
  });
});
