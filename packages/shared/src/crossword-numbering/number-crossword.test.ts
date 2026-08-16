import { describe, expect, it } from 'vitest';

import type { PlacedWord } from '../crossword-generator';
import { numberCrossword } from './number-crossword';

/** A word running left to right from the given square. */
const across = (word: string, row: number, col: number): PlacedWord => ({
  word,
  orientation: 'across',
  cells: Array.from({ length: word.length }, (_unused, step) => ({ row, col: col + step })),
});

/** A word running top to bottom from the given square. */
const down = (word: string, row: number, col: number): PlacedWord => ({
  word,
  orientation: 'down',
  cells: Array.from({ length: word.length }, (_unused, step) => ({ row: row + step, col })),
});

/** What each word was numbered, as `word: number`, for a table that reads aloud. */
const numbersOf = (placedWords: readonly PlacedWord[]): Readonly<Record<string, number>> =>
  Object.fromEntries(
    numberCrossword(placedWords).map(({ wordIndex, number }) => [
      placedWords[wordIndex]!.word,
      number,
    ]),
  );

describe('numberCrossword', () => {
  it('numbers a lone word from one', () => {
    expect(numbersOf([across('cat', 2, 3)])).toEqual({ cat: 1 });
  });

  it('numbers the starting squares down the grid and then across it', () => {
    //   0 1 2 3
    // 0 . E A R
    // 1 . . . .
    // 2 O . . .
    // 3 W I N .
    const numbers = numbersOf([down('ow', 2, 0), across('ear', 0, 1), across('win', 3, 0)]);

    expect(numbers).toEqual({ ear: 1, ow: 2, win: 3 });
  });

  it('orders two starting squares of the same row by column', () => {
    expect(numbersOf([across('tin', 0, 4), across('cat', 0, 0)])).toEqual({ cat: 1, tin: 2 });
  });

  it('gives one number to the across and the down word that start in the same square', () => {
    //   0 1 2
    // 0 C A T
    // 1 A . .
    // 2 R . .
    const numbers = numbersOf([across('cat', 0, 0), down('car', 0, 0), down('tin', 0, 2)]);

    expect(numbers).toEqual({ cat: 1, car: 1, tin: 2 });
  });

  it('numbers no square a word merely passes through', () => {
    //   0 1 2
    // 0 . C .
    // 1 E A R
    // 2 . T .
    // `ear` crosses `cat` at its middle square, which starts nothing.
    const numbering = numberCrossword([down('cat', 0, 1), across('ear', 1, 0)]);

    expect(numbering.map(({ start, number }) => ({ ...start, number }))).toEqual([
      { row: 0, col: 1, number: 1 },
      { row: 1, col: 0, number: 2 },
    ]);
  });

  it('hands back the words in numbering order, whatever order they were placed in', () => {
    const numbering = numberCrossword([across('win', 3, 0), across('ear', 0, 1), down('ow', 2, 0)]);

    expect(numbering.map(({ number }) => number)).toEqual([1, 2, 3]);
    expect(numbering.map(({ wordIndex }) => wordIndex)).toEqual([1, 2, 0]);
  });

  it('numbers nothing in a grid with no word in it', () => {
    expect(numberCrossword([])).toEqual([]);
  });

  it('passes over a word that occupies no square at all', () => {
    // Not something the generator produces, but the layout is read back out of
    // a document another client wrote, and a word with no squares starts nowhere.
    const numbering = numberCrossword([
      { word: 'ghost', orientation: 'across', cells: [] },
      across('cat', 0, 0),
    ]);

    expect(numbering).toEqual([{ wordIndex: 1, number: 1, start: { row: 0, col: 0 } }]);
  });
});
