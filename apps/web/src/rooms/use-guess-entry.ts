import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GridPosition } from 'shared';

import { cellKey, type GridView, type GuessableWord } from './word-visibility';

/**
 * Typing answers into the crossword: what stands in each square right now, and
 * what happens when a word fills up.
 *
 * The rule the whole ticket turns on is deliberately a single one: **a word is
 * answered the moment every one of its squares holds a letter**. It makes no
 * difference whether the player typed them or a crossing word that somebody
 * else solved filled them in — a square with the right letter in it is the same
 * square either way. Nothing else triggers a check: there is no Enter and no
 * button (see `docs/decisions/0011-typing-guesses-into-the-grid.md`).
 *
 * Being wrong is therefore not an event but a state: a word whose squares are
 * full and do not spell it is refused for as long as that is true, whichever
 * letter completed it. Which keeps the two ways a square can fill — typed, or
 * arriving through the subscription — from needing separate handling.
 *
 * The words are never spelled out here either. A filled word is offered to
 * {@link GuessableWord.accepts}, which is the only thing that knows the answer.
 */

/** How long a refused word stays on screen before its letters are taken back. */
const REFUSAL_FLASH_MS = 1200;

/** One square of the grid, ready to be drawn. */
export interface GuessEntryCell extends GridPosition {
  /** What stands in it: a solved letter, this player's own, or `''` when blank. */
  readonly letter: string;
  /** Whether this player may type here — false for every square already filled in. */
  readonly isEditable: boolean;
  /** Square typing moves on to within the same word; `null` at the end of it. */
  readonly nextCellKey: string | null;
  /** `true` while the word through this square is full and does not spell itself. */
  readonly isRefused: boolean;
}

/** Everything a grid needs to be typed into. */
export interface GuessEntry {
  /** Every lettered square of the board, keyed by {@link cellKey}. */
  readonly cells: ReadonlyMap<string, GuessEntryCell>;
  /** Puts a letter in a square, or clears it when given nothing. */
  readonly type: (position: GridPosition, letter: string) => void;
  /** `true` while a wrong answer is on the board, so the screen can say so once. */
  readonly hasRefusal: boolean;
}

/** What the player typed, by square. Squares they left alone are absent. */
type TypedLetters = Readonly<Record<string, string>>;

/** A single letter, as it is drawn in the grid — anything else is not typing. */
const letterTyped = (value: string): string => {
  const last = value.slice(-1).toUpperCase();

  return /^\p{L}$/u.test(last) ? last : '';
};

/** The words this player still has to answer — solved ones are nobody's input. */
const unsolvedOf = (view: GridView): readonly GuessableWord[] =>
  view.toGuess.filter((word) => !word.isSolved);

/**
 * Drives the guess entry of one grid.
 *
 * @param view - The board as this player may see it, from `gridViewFor`
 * @param onSolved - Records a word as answered; rejecting it leaves the word
 * open so a later render can try again
 * @returns The squares to draw and the handler that fills them
 *
 * @example
 * const entry = useGuessEntry(view, (wordId) => recordGuess({ roomId, playerId, wordId }));
 */
export const useGuessEntry = (
  view: GridView,
  onSolved: (wordId: string) => Promise<void>,
): GuessEntry => {
  const [typed, setTyped] = useState<TypedLetters>({});
  // Words already handed to `onSolved`, so the same answer is not written once
  // per render while the update is on its way back through the subscription.
  const submitted = useRef<Set<string>>(new Set());
  // Held in a ref rather than watched as a dependency: what decides that a word
  // is answered is the state of the board, never the identity of a callback the
  // caller happened to rebuild on its way down.
  const solve = useRef(onSolved);

  useEffect(() => {
    solve.current = onSolved;
  }, [onSolved]);

  /** Letters already in the grid for everyone: solved words, and nothing else. */
  const solvedLetters = useMemo(() => {
    const letters = new Map<string, string>();

    for (const cell of view.cells) {
      if (cell.letter !== null) {
        letters.set(cellKey(cell), cell.letter);
      }
    }

    return letters;
  }, [view]);

  const letterAt = useCallback(
    (key: string, letters: TypedLetters) => solvedLetters.get(key) ?? letters[key] ?? '',
    [solvedLetters],
  );

  /** How a word reads right now, `null` while any of its squares is still blank. */
  const spellingOf = useCallback(
    (word: GuessableWord, letters: TypedLetters): string | null => {
      const spelled = word.cells.map((cell) => letterAt(cellKey(cell), letters));

      return spelled.includes('') ? null : spelled.join('');
    },
    [letterAt],
  );

  /**
   * The word each square belongs to for the purpose of typing. A square where
   * two of this player's own words cross belongs to the first of them, so
   * typing always moves on somewhere and always moves on to the same place.
   */
  const wordOfCell = useMemo(() => {
    const owners = new Map<string, GuessableWord>();

    for (const word of unsolvedOf(view)) {
      for (const cell of word.cells) {
        const key = cellKey(cell);

        if (!owners.has(key) && !solvedLetters.has(key)) {
          owners.set(key, word);
        }
      }
    }

    return owners;
  }, [view, solvedLetters]);

  /**
   * Words whose squares are full and do not spell them. Read off the board
   * rather than remembered from a keystroke, so a word that filled up when
   * somebody else's answer crossed it is refused on exactly the same terms.
   */
  const refused = useMemo(
    () =>
      unsolvedOf(view).filter((word) => {
        const spelling = spellingOf(word, typed);

        return spelling !== null && !word.accepts(spelling);
      }),
    [view, typed, spellingOf],
  );

  const cells = useMemo(() => {
    const nextEditableAfter = (word: GuessableWord, position: number): string | null =>
      word.cells
        .slice(position + 1)
        .map(cellKey)
        .find((key) => !solvedLetters.has(key)) ?? null;

    const drawn = new Map<string, GuessEntryCell>();

    for (const cell of view.cells) {
      const key = cellKey(cell);
      const word = wordOfCell.get(key);

      drawn.set(key, {
        row: cell.row,
        col: cell.col,
        letter: letterAt(key, typed),
        isEditable: word !== undefined,
        nextCellKey:
          word === undefined
            ? null
            : nextEditableAfter(
                word,
                word.cells.findIndex((own) => cellKey(own) === key),
              ),
        isRefused: word !== undefined && refused.includes(word),
      });
    }

    return drawn;
  }, [view, wordOfCell, solvedLetters, letterAt, typed, refused]);

  /** Takes the letters of the refused words back off the board. */
  const withdrawRefused = useCallback(
    (letters: TypedLetters): Record<string, string> => {
      const next = { ...letters };

      for (const word of refused) {
        for (const cell of word.cells) {
          delete next[cellKey(cell)];
        }
      }

      return next;
    },
    [refused],
  );

  const type = useCallback(
    (position: GridPosition, letter: string) => {
      const key = cellKey(position);

      if (!wordOfCell.has(key)) {
        return;
      }

      const value = letterTyped(letter);

      setTyped((previous) => {
        // A refused word gets out of the way as soon as its player types again,
        // rather than making them delete a wrong answer letter by letter.
        const next = withdrawRefused(previous);

        if (value === '') {
          delete next[key];
        } else {
          next[key] = value;
        }

        return next;
      });
    },
    [wordOfCell, withdrawRefused],
  );

  useEffect(() => {
    for (const word of unsolvedOf(view)) {
      const spelling = spellingOf(word, typed);

      if (spelling === null || !word.accepts(spelling) || submitted.current.has(word.id)) {
        continue;
      }

      submitted.current.add(word.id);
      // A write that never lands would otherwise leave the word answered on
      // this screen and unsolved for everyone else, silently and for good.
      void solve.current(word.id).catch(() => submitted.current.delete(word.id));
    }
  }, [view, typed, spellingOf]);

  useEffect(() => {
    if (refused.length === 0) {
      return;
    }

    // Long enough for the player to read what they got wrong, and cleared
    // afterwards so the squares are ready for the next attempt without asking.
    const timer = setTimeout(() => setTyped(withdrawRefused), REFUSAL_FLASH_MS);

    return () => clearTimeout(timer);
  }, [refused, withdrawRefused]);

  return { cells, type, hasRefusal: refused.length > 0 };
};
