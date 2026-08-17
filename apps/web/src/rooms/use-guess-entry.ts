import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GridPosition, WordOrientation } from 'shared';

import {
  type GuessEntryCell,
  letterTyped,
  refusedCellsOf,
  refusedWordsOf,
  spellingOf,
  squaresOf,
  type TypedLetters,
  unsolvedOf,
  wordFilledAt,
  wordsOfCellIn,
  writtenLettersOf,
} from './guess-board';
import { cellKey, type GridView } from './word-visibility';

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
 * What does depend on the player is only which word they are filling in. Two
 * words hidden from the same player can cross, and the shared square belongs to
 * both; which of them typing runs along is decided by the word they are filling
 * in, not by the square. That is the one piece of state here that is about a
 * person rather than about the board. Where their cursor sits is a second such
 * piece, and it lives next door in `use-grid-cursor.ts`: the two are separate
 * because a cursor may stand on a square this player has no word through at all
 * (`docs/decisions/0016-the-cursor-lives-in-the-grid.md`).
 *
 * Reading the board is `guess-board.ts`; this is what remembers.
 */

/** How long a refused word stays on screen before its letters are taken back. */
const REFUSAL_FLASH_MS = 1200;

/** Everything a grid needs to be typed into. */
export interface GuessEntry {
  /** Every lettered square of the board, keyed by {@link cellKey}. */
  readonly cells: ReadonlyMap<string, GuessEntryCell>;
  /** Puts a letter in a square, or clears it when given nothing. */
  readonly type: (position: GridPosition, letter: string) => void;
  /**
   * Takes up the word this player is now filling in, through a square they have
   * moved onto: the one already being filled where it reaches that square, the
   * across one otherwise.
   *
   * `along` overrules that — it is what a perpendicular arrow and a word
   * reached for by name both ask with, and it is obeyed only where this player
   * really has a word running that way through the square. Nothing happens
   * where they have none at all, so the word being filled is kept rather than
   * dropped when the cursor wanders onto somebody else's square.
   */
  readonly takeUpWordAt: (position: GridPosition, along?: WordOrientation) => void;
  /** Moves to the next of this player's words through a square they are already on. */
  readonly switchWordAt: (position: GridPosition) => void;
  /**
   * Which way the word being filled runs, `null` before the player has taken up
   * a square. Said out loud by the screen, because swapping between two crossing
   * words changes nothing a reader who cannot see the grid would otherwise
   * notice.
   */
  readonly activeDirection: WordOrientation | null;
  /** `true` while a wrong answer is on the board, so the screen can say so once. */
  readonly hasRefusal: boolean;
  /** `true` when two of this player's own words cross, so switching is worth explaining. */
  readonly hasCrossings: boolean;
}

/**
 * Drives the guess entry of one grid.
 *
 * @param view - The board as this player may see it, from `gridViewFor`
 * @param onSolved - Records a word as answered. Rejecting it stops the word
 * counting as written down, so the next update of the board sends it again —
 * it is not retried on its own in between
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
  /**
   * The word being filled in right now.
   *
   * Typing runs along one word, and on a shared square there are two of them to
   * run along. Which one is not a property of the square — it is what the player
   * is doing, so it is remembered here and only changes when they move somewhere
   * the current word does not reach (see
   * `docs/decisions/0011-typing-guesses-into-the-grid.md`).
   */
  const [activeWordId, setActiveWordId] = useState<string | null>(null);
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

  const written = useMemo(() => writtenLettersOf(view), [view]);
  const wordsOfCell = useMemo(() => wordsOfCellIn(view, written), [view, written]);
  const refused = useMemo(() => refusedWordsOf(view, written, typed), [view, written, typed]);
  const refusedCells = useMemo(() => refusedCellsOf(view, refused), [view, refused]);

  const cells = useMemo(
    () => squaresOf({ view, written, wordsOfCell, typed, activeWordId, refusedCells }),
    [view, written, wordsOfCell, typed, activeWordId, refusedCells],
  );

  const takeUpWordAt = useCallback(
    (position: GridPosition, along?: WordOrientation) => {
      const word = wordFilledAt(wordsOfCell.get(cellKey(position)), activeWordId, along);

      if (word !== undefined) {
        setActiveWordId(word.id);
      }
    },
    [wordsOfCell, activeWordId],
  );

  const switchWordAt = useCallback(
    (position: GridPosition) => {
      const words = wordsOfCell.get(cellKey(position)) ?? [];

      if (words.length < 2) {
        return;
      }

      const current = words.findIndex((word) => word.id === activeWordId);

      setActiveWordId(words[(current + 1) % words.length]!.id);
    },
    [wordsOfCell, activeWordId],
  );

  /** Takes the letters of the refused words back off the board. */
  const withdrawRefused = useCallback(
    (letters: TypedLetters): Record<string, string> => {
      const next = { ...letters };

      for (const key of refusedCells) {
        delete next[key];
      }

      return next;
    },
    [refusedCells],
  );

  const type = useCallback(
    (position: GridPosition, letter: string) => {
      const key = cellKey(position);

      if (!wordsOfCell.has(key)) {
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
    [wordsOfCell, withdrawRefused],
  );

  useEffect(() => {
    for (const word of unsolvedOf(view)) {
      const spelling = spellingOf(word, written, typed);

      if (spelling === null || !word.accepts(spelling) || submitted.current.has(word.id)) {
        continue;
      }

      submitted.current.add(word.id);
      // A write that never lands would otherwise leave the word answered on
      // this screen and unsolved for everyone else, silently and for good.
      void solve.current(word.id).catch(() => submitted.current.delete(word.id));
    }
  }, [view, written, typed]);

  useEffect(() => {
    // Nothing to take back when every square of the wrong word is also held by
    // one still standing. The word stays refused and says so, and its player
    // clears it by typing — a timer that withdrew nothing would only fire again.
    if (refusedCells.size === 0) {
      return;
    }

    // Long enough for the player to read what they got wrong, and cleared
    // afterwards so the squares are ready for the next attempt without asking.
    const timer = setTimeout(() => setTyped(withdrawRefused), REFUSAL_FLASH_MS);

    return () => clearTimeout(timer);
  }, [refusedCells, withdrawRefused]);

  return {
    cells,
    type,
    takeUpWordAt,
    switchWordAt,
    activeDirection: unsolvedOf(view).find((word) => word.id === activeWordId)?.orientation ?? null,
    hasRefusal: refused.length > 0,
    hasCrossings: [...wordsOfCell.values()].some((words) => words.length > 1),
  };
};
