import { describe, expect, it } from 'vitest';

import { generateCrossword } from './generate-crossword';
import type { CrosswordLayout, PlacedWord } from './types';

/** The letters the grid holds under a placed word, in reading order. */
const readFromGrid = (layout: CrosswordLayout, placed: PlacedWord): string[] =>
  placed.cells.map(
    ({ row, col }) =>
      layout.cells.find((cell) => cell.row === row && cell.col === col)?.letter ?? '?',
  );

/** The squares two placed words share. */
const sharedSquares = (one: PlacedWord, other: PlacedWord) =>
  one.cells.filter((cell) =>
    other.cells.some(({ row, col }) => row === cell.row && col === cell.col),
  );

describe('generateCrossword with letters that carry accents', () => {
  it('lays straße out on six squares, its fifth one an ẞ', () => {
    const layout = generateCrossword(['straße', 'terrace', 'stream', 'tears']);
    const placed = layout.placedWords.find(({ word }) => word === 'straße');

    expect(placed?.cells).toHaveLength(6);
    expect(placed && readFromGrid(layout, placed)).toEqual(['S', 'T', 'R', 'A', 'ẞ', 'E']);
    expect(layout.cells.some(({ letter }) => letter === 'ẞ')).toBe(true);
    // Not SS, which is what the plain upper case (and the library) makes of it.
    expect(layout.cells.every(({ letter }) => letter.length === 1)).toBe(true);
  });

  it('stores the word as it was passed in and the squares as the board draws them', () => {
    const layout = generateCrossword(['café', 'épée', 'cape']);
    const café = layout.placedWords.find(({ word }) => word === 'café');

    expect(café && readFromGrid(layout, café)).toEqual(['C', 'A', 'F', 'É']);
    expect(layout.placedWords.map(({ word }) => word).sort()).toEqual(['café', 'cape', 'épée']);
  });

  it('crosses café and épée where both hold an É', () => {
    const layout = generateCrossword(['café', 'épée']);
    const [one, other] = layout.placedWords;

    expect(layout.placedWords).toHaveLength(2);
    expect(layout.unplacedWords).toEqual([]);

    const shared = one && other ? sharedSquares(one, other) : [];

    expect(shared).toHaveLength(1);
    expect(
      layout.cells.find(({ row, col }) => row === shared[0]?.row && col === shared[0]?.col)?.letter,
    ).toBe('É');
  });

  it('does not cross an É with an E, which are two letters', () => {
    // bébé holds É and see holds E, and they hold nothing else in common (so
    // café and fee, which share an F, could not show it). If an accent were
    // dropped on the way into the grid these two would cross.
    const layout = generateCrossword(['bébé', 'see']);

    expect(layout.placedWords).toEqual([]);
    expect(layout.unplacedWords).toEqual(['bébé', 'see']);
  });

  it('does cross words on a letter they hold exactly, accent or none', () => {
    const layout = generateCrossword(['bébé', 'bob']);

    expect(layout.placedWords.map(({ word }) => word).sort()).toEqual(['bob', 'bébé']);
  });

  it('treats a word composed and the same word decomposed as one set of letters', () => {
    const layout = generateCrossword(['café', 'épée']);

    expect(layout.placedWords).toHaveLength(2);
    expect(layout.cells.some(({ letter }) => letter === 'É')).toBe(true);
    expect(layout.cells.every(({ letter }) => letter.length === 1)).toBe(true);
  });

  it('holds ł, ő and ź as the letters they are, one square each', () => {
    const layout = generateCrossword(['łódź', 'ősz', 'zoo', 'dół']);
    const letters = layout.cells.map(({ letter }) => letter);

    for (const letter of ['Ł', 'Ó', 'Ź', 'Ő']) {
      expect(letters, letter).toContain(letter);
    }
  });
});
