import { useCallback, useState } from 'react';
import type { GridPosition, WordOrientation } from 'shared';

import type { GuessEntry } from './use-guess-entry';
import { cellKey, type GridView, type WordLocation } from './word-visibility';

/**
 * Where the next letter will land, and everything that moves it.
 *
 * The cursor is a square of the board, not a focused element. The squares of
 * other people's words are boxes rather than inputs, and the arrows cross them
 * like any other square, so nothing in the DOM could hold this — it is state,
 * and the grid draws it and follows it with the browser's focus rather than the
 * other way round (`docs/decisions/0016-the-cursor-lives-in-the-grid.md`).
 *
 * Which word is being filled in is not kept here: that belongs to the typing
 * (`use-guess-entry.ts`), and the two are deliberately separate axes. A square
 * can be under the cursor and be nobody's to type in; the word being filled
 * then simply holds, and the player types nothing until they move back onto a
 * square of their own.
 */

/** The four arrows, as a step across the board and as the way that step runs. */
const ARROWS = {
  ArrowUp: { rows: -1, cols: 0, along: 'down' },
  ArrowDown: { rows: 1, cols: 0, along: 'down' },
  ArrowLeft: { rows: 0, cols: -1, along: 'across' },
  ArrowRight: { rows: 0, cols: 1, along: 'across' },
} as const satisfies Record<
  string,
  { readonly rows: number; readonly cols: number; readonly along: WordOrientation }
>;

/** A key that moves the cursor across the board. */
export type ArrowKey = keyof typeof ARROWS;

/**
 * Whether a pressed key is one of the arrows.
 *
 * @param key - `KeyboardEvent.key`, as pressed
 * @returns `true` when the cursor has somewhere to go
 */
export const isArrowKey = (key: string): key is ArrowKey => Object.hasOwn(ARROWS, key);

/** The square the next letter will land in, and the ways it moves. */
export interface GridCursor {
  /** Where it stands, `null` until the player has taken up a square. */
  readonly at: GridPosition | null;
  /** The same square as a {@link cellKey}, for a screen drawing square by square. */
  readonly key: string | null;
  /**
   * Puts the cursor on a square and takes up a word through it.
   *
   * @param position - The square to move onto
   * @param along - The way the player asked to go, where they asked
   */
  readonly moveTo: (position: GridPosition, along?: WordOrientation) => void;
  /** Moves one square in the direction of an arrow, over whatever lies between. */
  readonly moveBy: (arrow: ArrowKey) => void;
  /** Reaches a word by name, from the panel: its first square this player may type in. */
  readonly reach: (word: WordLocation) => void;
  /** Clears the letter under the cursor, or steps back and clears there. */
  readonly eraseBack: () => void;
}

/**
 * Drives the cursor of one grid.
 *
 * @param entry - The squares and the typing, from {@link useGuessEntry}
 * @param view - The board, for how far the arrows may go
 * @returns Where the cursor is, and everything that moves it
 *
 * @example
 * const cursor = useGridCursor(entry, view);
 * cursor.moveBy('ArrowDown');
 */
export const useGridCursor = (entry: GuessEntry, view: GridView): GridCursor => {
  const [at, setAt] = useState<GridPosition | null>(null);

  const moveTo = useCallback(
    (position: GridPosition, along?: WordOrientation) => {
      // Kept as it was when the cursor has not actually moved, so a square that
      // merely reported its focus again does not redraw the board.
      setAt((previous) =>
        previous !== null && cellKey(previous) === cellKey(position) ? previous : position,
      );
      entry.takeUpWordAt(position, along);
    },
    [entry],
  );

  const moveBy = useCallback(
    (arrow: ArrowKey) => {
      if (at === null) {
        return;
      }

      const step = ARROWS[arrow];
      const isOnBoard = ({ row, col }: GridPosition) =>
        row >= 0 && row < view.rows && col >= 0 && col < view.cols;

      // Squares the crossword does not use are stepped over rather than stopped
      // at: a grid is mostly holes, and a cursor that stuck in one would leave
      // half the board reachable only with a mouse.
      let square = { row: at.row + step.rows, col: at.col + step.cols };

      while (isOnBoard(square)) {
        if (entry.cells.has(cellKey(square))) {
          moveTo(square, step.along);

          return;
        }

        square = { row: square.row + step.rows, col: square.col + step.cols };
      }
    },
    [at, entry, view, moveTo],
  );

  const reach = useCallback(
    (word: WordLocation) => {
      // The first square of the word that is still open, so a word reached for
      // by name is ready to be typed into rather than merely found. A word this
      // player explains has no such square — every one of its letters is
      // already written — so it is brought into view at its first square and
      // stays nobody's to type in.
      const landing =
        word.cells.find((cell) => entry.cells.get(cellKey(cell))?.source === 'own') ??
        word.cells[0];

      if (landing !== undefined) {
        moveTo(landing, word.orientation);
      }
    },
    [entry, moveTo],
  );

  const eraseBack = useCallback(() => {
    const cell = at === null ? undefined : entry.cells.get(cellKey(at));

    // Nothing to erase where this player types nothing: the letters of a solved
    // or an explained word are not theirs to take off the board.
    if (cell === undefined || cell.source !== 'own') {
      return;
    }

    if (cell.letter !== '') {
      entry.type(cell, '');

      return;
    }

    const back = cell.previousCellKey === null ? undefined : entry.cells.get(cell.previousCellKey);

    if (back !== undefined) {
      moveTo({ row: back.row, col: back.col });
      entry.type(back, '');
    }
  }, [at, entry, moveTo]);

  return {
    at,
    key: at === null ? null : cellKey(at),
    moveTo,
    moveBy,
    reach,
    eraseBack,
  };
};
