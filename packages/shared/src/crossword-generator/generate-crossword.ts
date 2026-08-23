import { generateLayout, type WordResult } from 'crossword-generator-x';

import type {
  CrosswordCell,
  CrosswordLayout,
  GridPosition,
  PlacedWord,
  WordOrientation,
} from './types';

/** An input word together with the position it was passed in at. */
interface InputWord {
  readonly inputIndex: number;
  readonly word: string;
}

/** A placement traced back to the input word it belongs to, in raw grid coordinates. */
interface Placement extends InputWord {
  readonly orientation: WordOrientation;
  readonly cells: readonly GridPosition[];
}

/** The letters a word occupies in the grid — the grid is rendered uppercase. */
const gridLettersOf = (word: string): string => word.toUpperCase();

const cellKey = ({ row, col }: GridPosition): string => `${row},${col}`;

/**
 * Groups the input words by their uppercase spelling, so a layout entry can be
 * traced back to the word the caller passed in (the library uppercases the
 * words it returns). Words that repeat share a bucket and are handed out in
 * input order.
 */
const groupWordsByLetters = (words: readonly string[]): Map<string, InputWord[]> => {
  const byLetters = new Map<string, InputWord[]>();

  words.forEach((word, inputIndex) => {
    const bucket = byLetters.get(gridLettersOf(word)) ?? [];

    bucket.push({ word, inputIndex });
    byLetters.set(gridLettersOf(word), bucket);
  });

  return byLetters;
};

/**
 * Converts one layout entry into a placement, or returns `null` when the entry
 * cannot be used — it was not placed, it carries no coordinates, or it matches
 * no input word still awaiting placement. Output of a third-party library is
 * treated as external input: only what survives this check reaches the
 * returned layout.
 */
const toPlacement = (
  entry: WordResult,
  unmatchedWords: Map<string, InputWord[]>,
): Placement | null => {
  const { orientation, startx, starty } = entry;

  if (orientation !== 'across' && orientation !== 'down') return null;
  if (startx === undefined || starty === undefined) return null;

  const matched = unmatchedWords.get(entry.answer)?.shift();

  if (matched === undefined) return null;

  // The library reports one-based coordinates; the layout contract is zero-based.
  const isDown = orientation === 'down';
  const cells = [...gridLettersOf(matched.word)].map((_letter, offset) => ({
    row: isDown ? starty - 1 + offset : starty - 1,
    col: isDown ? startx - 1 : startx - 1 + offset,
  }));

  return { ...matched, orientation, cells };
};

/**
 * Writes placements into a letter grid one by one, skipping any placement that
 * would contradict a letter already written. Guarantees that every committed
 * word can be read back from the grid it shares with the others.
 */
const commitPlacements = (
  placements: readonly Placement[],
): {
  readonly committed: readonly Placement[];
  readonly grid: ReadonlyMap<string, CrosswordCell>;
} => {
  const grid = new Map<string, CrosswordCell>();
  const committed: Placement[] = [];

  for (const placement of placements) {
    const letters = gridLettersOf(placement.word);
    const staged = placement.cells.map((cell, offset) => ({
      ...cell,
      letter: letters.charAt(offset),
    }));
    const conflicts = staged.some((cell) => {
      const written = grid.get(cellKey(cell));

      return written !== undefined && written.letter !== cell.letter;
    });

    if (conflicts) continue;

    staged.forEach((cell) => grid.set(cellKey(cell), cell));
    committed.push(placement);
  }

  return { committed, grid };
};

const boundingBoxOf = (placements: readonly Placement[]): GridPosition => {
  const cells = placements.flatMap((placement) => placement.cells);

  return {
    row: Math.min(...cells.map(({ row }) => row)),
    col: Math.min(...cells.map(({ col }) => col)),
  };
};

/** A layout with no grid at all — every word given back as unplaced. */
const emptyLayout = (unplacedWords: readonly string[]): CrosswordLayout => ({
  rows: 0,
  cols: 0,
  cells: [],
  placedWords: [],
  unplacedWords,
});

/**
 * How many candidate layouts are built before the best of them is returned.
 *
 * The library places words at random, so the same list gives a different grid,
 * and a different number of leftovers, on every call: repeated runs of ten
 * near-disjoint three-letter words leave anywhere between three and six words
 * out. Building several grids and keeping the best turns a single throw of the
 * dice into the best of ten.
 *
 * The repetition lives here rather than in the library's own `maxAttempts`
 * because the two count different things. The library retries internally
 * already (fifty times by default) and keeps the grid with the fewest words
 * *it* failed to place — but words are lost after it returns as well, by
 * `toPlacement` and by `commitPlacements`, and it cannot see those. Only a
 * finished `CrosswordLayout` says what a run actually cost, so the comparison
 * belongs on this side of the boundary.
 *
 * Ten and not more, because more attempts do not buy the missing words back: a
 * word sharing no letter with any other cannot cross anything, however many
 * grids are built.
 */
const LAYOUT_ATTEMPTS = 10;

/**
 * How long attempts may go on being started, in milliseconds.
 *
 * An attempt costs what the library charges for it, and that price is not flat:
 * as long as every word finds a place a layout is cheap, but the first word
 * that cannot be placed turns the library's backtracking on, over a grid three
 * times the longest word — measured here, one attempt at twenty ordinary words
 * costs 20 ms while nineteen of them plus an uncrossable `zzz` costs 320 ms,
 * and nineteen sixteen-letter words plus that same `zzz` cost 3 seconds. Ten of
 * those in a row would be half a minute, and every one of them runs inside the
 * owner's click on "Create room".
 *
 * Half a second is above every case where the repetition earns anything: the
 * near-disjoint list that motivated it takes 107 ms for all ten attempts. It is
 * below the cases where it earns nothing, where the leftovers were the same on
 * the first attempt as on the tenth because the words in question cannot cross
 * anything at all.
 *
 * The budget is checked before an attempt is started, never during one, so the
 * first attempt always finishes: a list too expensive to lay out twice costs
 * exactly one layout, which is what it cost before there was a second attempt.
 * It is counted on the wall clock, the same one the library times itself by,
 * rather than on `performance` — this package is pure logic and knows neither a
 * browser nor a Node runtime.
 */
const ATTEMPT_BUDGET_MS = 500;

/**
 * Builds one candidate layout — a single draw, not the answer.
 *
 * A draw that places nothing comes back as an empty layout rather than as a
 * failure, so it can be compared with the other draws and lose to any of them
 * that placed something.
 *
 * @param words - Words to lay out, in the owner's original letter case
 * @returns One layout, scored by its `unplacedWords`
 */
const attemptLayout = (words: readonly string[]): CrosswordLayout => {
  const layout = generateLayout(words.map((word) => ({ answer: word })));
  const unmatchedWords = groupWordsByLetters(words);
  const placements = layout.result
    .map((entry) => toPlacement(entry, unmatchedWords))
    .filter((placement): placement is Placement => placement !== null)
    .sort((left, right) => left.inputIndex - right.inputIndex);

  const { committed, grid } = commitPlacements(placements);

  if (committed.length === 0) return emptyLayout([...words]);

  const origin = boundingBoxOf(committed);
  const shift = ({ row, col }: GridPosition): GridPosition => ({
    row: row - origin.row,
    col: col - origin.col,
  });

  const cells: CrosswordCell[] = [...grid.values()]
    .map((cell) => ({ ...shift(cell), letter: cell.letter }))
    .sort((left, right) => left.row - right.row || left.col - right.col);

  const placedWords: PlacedWord[] = committed.map(({ word, orientation, cells: wordCells }) => ({
    word,
    orientation,
    cells: wordCells.map(shift),
  }));

  const placedInputIndexes = new Set(committed.map(({ inputIndex }) => inputIndex));

  return {
    rows: Math.max(...cells.map(({ row }) => row)) + 1,
    cols: Math.max(...cells.map(({ col }) => col)) + 1,
    cells,
    placedWords,
    unplacedWords: words.filter((_word, index) => !placedInputIndexes.has(index)),
  };
};

/**
 * Lays a list of words out as a crossword.
 *
 * Words are placed so that they intersect on shared letters; whatever does not
 * fit is returned in `unplacedWords` instead of being dropped, so the caller
 * can warn the owner and still start the game. Word validation (count, length,
 * alphabet, duplicates) belongs to `word-list-validator` and is not repeated
 * here — any word this function cannot place simply comes back unplaced.
 *
 * Up to `LAYOUT_ATTEMPTS` layouts are built and the one leaving the fewest
 * words unplaced is returned; equally good layouts are settled in favour of the
 * earlier one. A layout that leaves nothing unplaced ends the search, and so
 * does spending `ATTEMPT_BUDGET_MS` on the attempts made so far — a word list
 * that fits costs a single attempt, and so does one too expensive to lay out
 * twice. This is not a promise that every word will be placed: words that share
 * no letters cannot cross, and no number of attempts changes that.
 *
 * The layout is not stable across calls: the underlying generator explores
 * placements at random, so the same words can produce different grids.
 *
 * @param words - Words to lay out, in the owner's original letter case
 * @returns The grid, the placed words bound to their cells, and the leftovers
 *
 * @example
 * const layout = generateCrossword(['apple', 'plum', 'melon']);
 * layout.placedWords[0]; // { word: 'apple', orientation: 'across', cells: [...] }
 */
export const generateCrossword = (words: readonly string[]): CrosswordLayout => {
  if (words.length === 0) return emptyLayout([]);

  const startedAt = Date.now();
  let best = attemptLayout(words);

  for (
    let attempt = 1;
    attempt < LAYOUT_ATTEMPTS &&
    best.unplacedWords.length > 0 &&
    Date.now() - startedAt < ATTEMPT_BUDGET_MS;
    attempt++
  ) {
    const candidate = attemptLayout(words);

    if (candidate.unplacedWords.length < best.unplacedWords.length) best = candidate;
  }

  return best;
};
