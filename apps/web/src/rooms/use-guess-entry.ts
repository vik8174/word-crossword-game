import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GridPosition, WordOrientation } from 'shared';

import {
  cellKey,
  type GridCellContent,
  type GridView,
  type GuessableWord,
} from './word-visibility';

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
 * What does depend on the player is only where the cursor goes. Two words
 * hidden from the same player can cross, and the shared square belongs to both;
 * which of them typing runs along is decided by the word they are filling in,
 * not by the square. That is the one piece of state here that is about a person
 * rather than about the board.
 *
 * The words are never spelled out here either. A filled word is offered to
 * {@link GuessableWord.accepts}, which is the only thing that knows the answer.
 */

/** How long a refused word stays on screen before its letters are taken back. */
const REFUSAL_FLASH_MS = 1200;

/**
 * Where the letter drawn in a square comes from, and so what the square is.
 *
 * A square already holding a letter is nobody's to type in, whether the letter
 * was earned by the group or written in for this player alone — but a screen
 * still has to draw those two apart, so this says which it is rather than only
 * whether the square takes input.
 */
export type CellSource =
  /** A word the group has answered runs through it. */
  | 'solved'
  /** A word this player explains runs through it: written in for them alone. */
  | 'explained'
  /** One of this player's own words, still open — the only square they may type in. */
  | 'own'
  /** Nothing of this player's runs through it, and nothing has been answered there. */
  | 'blank';

/** One square of the grid, ready to be drawn. */
export interface GuessEntryCell extends GridPosition {
  /** What stands in it: a letter already on the board, this player's own, or `''` when blank. */
  readonly letter: string;
  /** Why the letter is there — and `own` is exactly the square this player types in. */
  readonly source: CellSource;
  /** Square typing moves on to from here; `null` at the end of the word being filled. */
  readonly nextCellKey: string | null;
  /** Which way typing runs from here, `null` where this player types nothing. */
  readonly direction: WordOrientation | null;
  /** `true` for the squares of the word this player is filling in right now. */
  readonly isActive: boolean;
  /** `true` when a second word of this player's own also runs through this square. */
  readonly isCrossing: boolean;
  /** `true` while the word through this square is full and does not spell itself. */
  readonly isRefused: boolean;
}

/** Everything a grid needs to be typed into. */
export interface GuessEntry {
  /** Every lettered square of the board, keyed by {@link cellKey}. */
  readonly cells: ReadonlyMap<string, GuessEntryCell>;
  /** Puts a letter in a square, or clears it when given nothing. */
  readonly type: (position: GridPosition, letter: string) => void;
  /** Takes up a square: the word being filled follows the player's attention. */
  readonly focus: (position: GridPosition) => void;
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

/** What the player typed, by square. Squares they left alone are absent. */
type TypedLetters = Readonly<Record<string, string>>;

/**
 * What a square is, given what it already holds and whether this player has a
 * word of their own still open through it.
 *
 * A letter already on the board settles it: nobody types over a letter that is
 * there, so `own` is left for the squares that are genuinely empty.
 */
const sourceOf = (content: GridCellContent, isOwn: boolean): CellSource => {
  if (content.kind !== 'empty') {
    return content.kind;
  }

  return isOwn ? 'own' : 'blank';
};

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

  /**
   * Letters already on this player's board: the words the group has answered,
   * and the words this player explains.
   *
   * The two are one thing here on purpose. Whichever of them wrote the letter,
   * it is right, it is in front of the player, and nobody is going to type over
   * it — so a word of theirs that crosses it is that much nearer being full,
   * exactly as `docs/decisions/0011-typing-guesses-into-the-grid.md` decided for
   * solved crossings. Where the letter came from matters to the screen, not to
   * the typing, so the difference is kept for drawing and dropped here.
   */
  const writtenLetters = useMemo(() => {
    const letters = new Map<string, string>();

    for (const cell of view.cells) {
      if (cell.content.kind !== 'empty') {
        letters.set(cellKey(cell), cell.content.letter);
      }
    }

    return letters;
  }, [view]);

  const letterAt = useCallback(
    (key: string, letters: TypedLetters) => writtenLetters.get(key) ?? letters[key] ?? '',
    [writtenLetters],
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
   * Every word of this player's own that runs through each square they may type
   * in, across before down.
   *
   * A square is rarely shared, but when two words hidden from the same player
   * cross, it belongs to both of them equally — which is why this is a list and
   * not an owner. Squares that already hold a letter are left out: nobody types
   * there, whether the letter was answered by the group or written in because
   * this player explains the word crossing it.
   */
  const wordsOfCell = useMemo(() => {
    const through = new Map<string, GuessableWord[]>();
    const acrossFirst = [...unsolvedOf(view)].sort((left, right) =>
      left.orientation === right.orientation ? 0 : left.orientation === 'across' ? -1 : 1,
    );

    for (const word of acrossFirst) {
      for (const cell of word.cells) {
        const key = cellKey(cell);

        if (!writtenLetters.has(key)) {
          through.set(key, [...(through.get(key) ?? []), word]);
        }
      }
    }

    return through;
  }, [view, writtenLetters]);

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

  /** The word typing follows from a square: the active one when it reaches here. */
  const wordFilledAt = useCallback(
    (key: string): GuessableWord | undefined => {
      const words = wordsOfCell.get(key);

      return words?.find((word) => word.id === activeWordId) ?? words?.[0];
    },
    [wordsOfCell, activeWordId],
  );

  const focus = useCallback(
    (position: GridPosition) => {
      const word = wordFilledAt(cellKey(position));

      if (word !== undefined) {
        setActiveWordId(word.id);
      }
    },
    [wordFilledAt],
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

  /**
   * Squares of the refused words that are theirs alone.
   *
   * A player's own two words can cross, and then the shared square carries a
   * letter of both. Taking a wrong answer back must not take that letter with
   * it: the word still standing has just as much claim to the square, and its
   * owner typed it on purpose. Once the refused word's own squares are empty it
   * is no longer full, so it stops being refused either way.
   */
  const refusedCells = useMemo(() => {
    const shared = new Set(
      unsolvedOf(view)
        .filter((word) => !refused.includes(word))
        .flatMap((word) => word.cells.map(cellKey)),
    );

    return new Set(
      refused.flatMap((word) => word.cells.map(cellKey)).filter((key) => !shared.has(key)),
    );
  }, [view, refused]);

  const cells = useMemo(() => {
    const nextEditableAfter = (word: GuessableWord, position: number): string | null =>
      word.cells
        .slice(position + 1)
        .map(cellKey)
        .find((key) => !writtenLetters.has(key)) ?? null;

    const drawn = new Map<string, GuessEntryCell>();

    for (const cell of view.cells) {
      const key = cellKey(cell);
      const word = wordFilledAt(key);

      drawn.set(key, {
        row: cell.row,
        col: cell.col,
        letter: letterAt(key, typed),
        source: sourceOf(cell.content, word !== undefined),
        nextCellKey:
          word === undefined
            ? null
            : nextEditableAfter(
                word,
                word.cells.findIndex((own) => cellKey(own) === key),
              ),
        direction: word?.orientation ?? null,
        isActive: word !== undefined && word.id === activeWordId,
        isCrossing: (wordsOfCell.get(key)?.length ?? 0) > 1,
        // Marked as refused exactly where the letters are about to be taken
        // back, so a square held by a second, still-standing word looks the way
        // it will go on looking.
        isRefused: word !== undefined && refusedCells.has(key),
      });
    }

    return drawn;
  }, [
    view,
    wordsOfCell,
    wordFilledAt,
    activeWordId,
    writtenLetters,
    letterAt,
    typed,
    refusedCells,
  ]);

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
    focus,
    switchWordAt,
    activeDirection: unsolvedOf(view).find((word) => word.id === activeWordId)?.orientation ?? null,
    hasRefusal: refused.length > 0,
    hasCrossings: [...wordsOfCell.values()].some((words) => words.length > 1),
  };
};
