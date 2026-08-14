import { describe, expect, it } from 'vitest';

import { generateCrossword } from './generate-crossword';
import type { CrosswordLayout, PlacedWord } from './types';

const TYPICAL_10 = [
  'apple',
  'bread',
  'cheese',
  'dinner',
  'engine',
  'flower',
  'garden',
  'hunter',
  'island',
  'jacket',
];

const TYPICAL_20 = [
  ...TYPICAL_10,
  'kitchen',
  'ladder',
  'monkey',
  'needle',
  'orange',
  'pencil',
  'rabbit',
  'silver',
  'temple',
  'window',
];

const SHORTEST_10 = ['cat', 'dog', 'ant', 'toe', 'tan', 'oat', 'net', 'rat', 'ear', 'sun'];

const LONGEST_10 = [
  'independence',
  'refrigerator',
  'thanksgiving',
  'construction',
  'neighborhood',
  'photographer',
  'relationship',
  'presentation',
  'organisation',
  'mathematical',
];

/**
 * Words built from mutually exclusive letters: no two of them can ever cross,
 * so the generator has nothing to build a crossword out of. Ten such words are
 * impossible (26 letters do not stretch that far), which is exactly why this
 * set is smaller than a real game's word list.
 */
const NO_SHARED_LETTERS = ['abc', 'def', 'ghi', 'jkl', 'mno', 'pqr', 'stu', 'vwx'];

const letterAt = (layout: CrosswordLayout, row: number, col: number): string | undefined =>
  layout.cells.find((cell) => cell.row === row && cell.col === col)?.letter;

/** Reads the letters the grid actually holds under a placed word, in reading order. */
const readFromGrid = (layout: CrosswordLayout, placed: PlacedWord): string =>
  placed.cells.map(({ row, col }) => letterAt(layout, row, col) ?? '?').join('');

/**
 * Asserts everything that must hold for any layout, whatever grid the
 * generator happened to produce for it — the generator places words at random,
 * so a test pinned to one exact grid would be flaky by construction.
 */
const expectConsistentLayout = (layout: CrosswordLayout, input: readonly string[]): void => {
  // Nothing is lost and nothing is invented: the input is fully accounted for.
  expect(
    [...layout.placedWords.map((placed) => placed.word), ...layout.unplacedWords].sort(),
  ).toEqual([...input].sort());

  // Every placed word can be read back from the grid, spelled as it was given.
  for (const placed of layout.placedWords) {
    expect(placed.cells).toHaveLength(placed.word.length);
    expect(readFromGrid(layout, placed)).toBe(placed.word.toUpperCase());
    expect(new Set(placed.cells.map(({ row, col }) => `${row},${col}`)).size).toBe(
      placed.cells.length,
    );
  }

  // One letter per coordinate — crossing words agree on the letter they share.
  const coordinates = layout.cells.map(({ row, col }) => `${row},${col}`);
  expect(new Set(coordinates).size).toBe(coordinates.length);

  // The grid holds the placed words and nothing else, tightly cropped to them.
  const wordCoordinates = new Set(
    layout.placedWords.flatMap((placed) => placed.cells.map(({ row, col }) => `${row},${col}`)),
  );
  expect(new Set(coordinates)).toEqual(wordCoordinates);

  for (const cell of layout.cells) {
    expect(cell.letter).toMatch(/^[A-Z]$/);
    expect(cell.row).toBeGreaterThanOrEqual(0);
    expect(cell.col).toBeGreaterThanOrEqual(0);
    expect(cell.row).toBeLessThan(layout.rows);
    expect(cell.col).toBeLessThan(layout.cols);
  }

  if (layout.cells.length > 0) {
    expect(Math.min(...layout.cells.map(({ row }) => row))).toBe(0);
    expect(Math.min(...layout.cells.map(({ col }) => col))).toBe(0);
    expect(Math.max(...layout.cells.map(({ row }) => row))).toBe(layout.rows - 1);
    expect(Math.max(...layout.cells.map(({ col }) => col))).toBe(layout.cols - 1);
  }
};

const countIntersections = (layout: CrosswordLayout): number => {
  const usage = new Map<string, number>();

  for (const placed of layout.placedWords) {
    for (const { row, col } of placed.cells) {
      const key = `${row},${col}`;

      usage.set(key, (usage.get(key) ?? 0) + 1);
    }
  }

  return [...usage.values()].filter((count) => count > 1).length;
};

describe('generateCrossword', () => {
  it('places a typical word list into a grid', () => {
    const layout = generateCrossword(TYPICAL_10);

    expect(layout.unplacedWords).toEqual([]);
    expect(layout.placedWords).toHaveLength(TYPICAL_10.length);
    expect(layout.rows).toBeGreaterThan(0);
    expect(layout.cols).toBeGreaterThan(0);
    expectConsistentLayout(layout, TYPICAL_10);
  });

  it('crosses words on shared letters', () => {
    const layout = generateCrossword(TYPICAL_10);

    expect(countIntersections(layout)).toBeGreaterThan(0);
  });

  it('stays consistent across repeated runs of the same word list', () => {
    for (let run = 0; run < 20; run++) {
      expectConsistentLayout(generateCrossword(TYPICAL_10), TYPICAL_10);
    }
  });

  it('places the maximum word count a game allows', () => {
    const layout = generateCrossword(TYPICAL_20);

    expect(layout.unplacedWords).toEqual([]);
    expectConsistentLayout(layout, TYPICAL_20);
  });

  it('places words of the shortest allowed length', () => {
    const layout = generateCrossword(SHORTEST_10);

    expect(layout.placedWords.length).toBeGreaterThan(0);
    expectConsistentLayout(layout, SHORTEST_10);
  });

  it('places words of the longest allowed length', () => {
    const layout = generateCrossword(LONGEST_10);

    expect(layout.placedWords.length).toBeGreaterThan(0);
    expectConsistentLayout(layout, LONGEST_10);
  });

  it('places a mix of the shortest and longest words', () => {
    const mixed = [...SHORTEST_10.slice(0, 5), ...LONGEST_10.slice(0, 5)];
    const layout = generateCrossword(mixed);

    expect(layout.placedWords.length).toBeGreaterThan(0);
    expectConsistentLayout(layout, mixed);
  });

  it('returns an empty layout instead of failing when no words can cross', () => {
    const layout = generateCrossword(NO_SHARED_LETTERS);

    expect(layout.placedWords).toEqual([]);
    expect(layout.unplacedWords).toEqual(NO_SHARED_LETTERS);
    expect(layout.rows).toBe(0);
    expect(layout.cols).toBe(0);
    expect(layout.cells).toEqual([]);
  });

  it('returns the words it could not fit instead of dropping them', () => {
    const mostlyUnfittable = [...NO_SHARED_LETTERS, 'apple', 'plum'];
    const layout = generateCrossword(mostlyUnfittable);

    expect(layout.unplacedWords.length).toBeGreaterThan(0);
    expectConsistentLayout(layout, mostlyUnfittable);
  });

  it('keeps the words spelled as they were given', () => {
    const mixedCase = ['Apple', 'PLUM', 'melon', 'Lemon', 'peach'];
    const layout = generateCrossword(mixedCase);

    expect(
      [...layout.placedWords.map((placed) => placed.word), ...layout.unplacedWords].sort(),
    ).toEqual([...mixedCase].sort());
    expectConsistentLayout(layout, mixedCase);
  });

  it('reports placed and unplaced words in the order they were given', () => {
    const layout = generateCrossword(TYPICAL_20);
    const placedOrder = layout.placedWords.map((placed) => placed.word);

    expect(placedOrder).toEqual(TYPICAL_20.filter((word) => placedOrder.includes(word)));
  });

  it('returns an empty layout for an empty word list', () => {
    const layout = generateCrossword([]);

    expect(layout).toEqual({ rows: 0, cols: 0, cells: [], placedWords: [], unplacedWords: [] });
  });

  it('reports a word it cannot lay out as unplaced rather than failing', () => {
    const layout = generateCrossword(['a']);

    expect(layout.unplacedWords).toEqual(['a']);
    expect(layout.placedWords).toEqual([]);
  });
});
