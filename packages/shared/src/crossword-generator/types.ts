/**
 * Public contract of the `crossword-generator` module.
 *
 * The whole `CrosswordLayout` is written verbatim into the Firestore room
 * document, so every shape here stays Firestore-friendly: flat arrays of
 * primitives or maps, never an array nested directly inside another array
 * (Firestore rejects those).
 */

/** Direction a word runs in the grid: left-to-right or top-to-bottom. */
export type WordOrientation = 'across' | 'down';

/** Zero-based grid coordinate. Row 0 is the topmost row, column 0 the leftmost. */
export interface GridPosition {
  readonly row: number;
  readonly col: number;
}

/** A grid cell that holds a letter. Cells without letters are simply absent. */
export interface CrosswordCell extends GridPosition {
  /** Single uppercase letter, as rendered in the grid. */
  readonly letter: string;
}

/**
 * A word that fit into the grid, together with the cells that spell it.
 *
 * `cells` are listed in reading order (first letter first) and always have the
 * same length as `word`. Two placed words intersect when they share a cell.
 */
export interface PlacedWord {
  /** The word exactly as it was passed in, original letter case preserved. */
  readonly word: string;
  readonly orientation: WordOrientation;
  readonly cells: readonly GridPosition[];
}

/**
 * A generated crossword: the grid, the words placed in it, and the words that
 * did not fit.
 *
 * `placedWords` plus `unplacedWords` always add up to the input word list, so
 * no word is ever silently lost.
 */
export interface CrosswordLayout {
  /** Grid height. `0` when no word could be placed at all. */
  readonly rows: number;
  /** Grid width. `0` when no word could be placed at all. */
  readonly cols: number;
  /** Every lettered cell of the grid, in row-major order. */
  readonly cells: readonly CrosswordCell[];
  /** Words that fit, in the order they were passed in. */
  readonly placedWords: readonly PlacedWord[];
  /** Words that did not fit, in the order they were passed in. */
  readonly unplacedWords: readonly string[];
}
