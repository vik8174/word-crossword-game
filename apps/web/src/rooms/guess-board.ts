import type { GridPosition, WordOrientation } from 'shared';

import {
  cellKey,
  type GridCellContent,
  type GridView,
  type GuessableWord,
} from './word-visibility';

/**
 * The board a player types into, read square by square.
 *
 * Everything here is a plain function of what the screen was handed and what
 * the player has typed so far: which squares already hold a letter, which of
 * this player's words run through a square, how a word reads right now, and
 * which words are full but wrong. Nothing in it remembers anything.
 *
 * It is separate from {@link useGuessEntry} because that hook is about a person
 * — the word they are filling in, the answers they have sent — while this is
 * about the board, which is the same for anybody handed the same {@link GridView}.
 * Keeping the two apart is what lets the cursor be worked out from the board
 * (see `use-grid-cursor.ts`) without going through the typing.
 *
 * No word is spelled out here either. A filled word is offered to
 * {@link GuessableWord.accepts}, which is the only thing that knows the answer.
 */

/** What the player typed, by square. Squares they left alone are absent. */
export type TypedLetters = Readonly<Record<string, string>>;

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
  /**
   * Square a backspace steps back to from here; `null` at the start of the word
   * being filled.
   *
   * The mirror of {@link nextCellKey}, and it skips the same squares: a letter
   * already written in is nobody's to delete, so stepping back walks over it
   * exactly as typing walks over it going forward.
   */
  readonly previousCellKey: string | null;
  /** Which way typing runs from here, `null` where this player types nothing. */
  readonly direction: WordOrientation | null;
  /** `true` for the squares of the word this player is filling in right now. */
  readonly isActive: boolean;
  /** `true` when a second word of this player's own also runs through this square. */
  readonly isCrossing: boolean;
  /** `true` while the word through this square is full and does not spell itself. */
  readonly isRefused: boolean;
}

/**
 * Everything the squares of one board are worked out from: the board itself,
 * the letters already on it ({@link writtenLettersOf}), this player's own open
 * words by square ({@link wordsOfCellIn}), what they have typed, the word they
 * are filling in, and the squares about to be cleared ({@link refusedCellsOf}).
 */
interface BoardReading {
  readonly view: GridView;
  readonly written: ReadonlyMap<string, string>;
  readonly wordsOfCell: ReadonlyMap<string, readonly GuessableWord[]>;
  readonly typed: TypedLetters;
  readonly activeWordId: string | null;
  readonly refusedCells: ReadonlySet<string>;
}

/**
 * What a square is, given what it already holds and whether this player has a
 * word of their own still open through it.
 *
 * A letter already on the board settles it: nobody types over a letter that is
 * there, so `own` is left for the squares that are genuinely empty.
 */
export const sourceOf = (content: GridCellContent, isOwn: boolean): CellSource => {
  if (content.kind !== 'empty') {
    return content.kind;
  }

  return isOwn ? 'own' : 'blank';
};

/** A single letter, as it is drawn in the grid — anything else is not typing. */
export const letterTyped = (value: string): string => {
  const last = value.slice(-1).toUpperCase();

  return /^\p{L}$/u.test(last) ? last : '';
};

/** The words this player still has to answer — solved ones are nobody's input. */
export const unsolvedOf = (view: GridView): readonly GuessableWord[] =>
  view.toGuess.filter((word) => !word.isSolved);

/**
 * Letters already on this player's board: the words the group has answered, and
 * the words this player explains.
 *
 * The two are one thing here on purpose. Whichever of them wrote the letter, it
 * is right, it is in front of the player, and nobody is going to type over it —
 * so a word of theirs that crosses it is that much nearer being full, exactly as
 * `docs/decisions/0011-typing-guesses-into-the-grid.md` decided for solved
 * crossings. Where the letter came from matters to the screen, not to the
 * typing, so the difference is kept for drawing and dropped here.
 */
export const writtenLettersOf = (view: GridView): ReadonlyMap<string, string> => {
  const letters = new Map<string, string>();

  for (const cell of view.cells) {
    if (cell.content.kind !== 'empty') {
      letters.set(cellKey(cell), cell.content.letter);
    }
  }

  return letters;
};

/**
 * Every word of this player's own that runs through each square they may type
 * in, across before down.
 *
 * A square is rarely shared, but when two words hidden from the same player
 * cross, it belongs to both of them equally — which is why this is a list and
 * not an owner. Squares that already hold a letter are left out: nobody types
 * there, whether the letter was answered by the group or written in because this
 * player explains the word crossing it.
 */
export const wordsOfCellIn = (
  view: GridView,
  written: ReadonlyMap<string, string>,
): ReadonlyMap<string, readonly GuessableWord[]> => {
  const through = new Map<string, GuessableWord[]>();
  const acrossFirst = [...unsolvedOf(view)].sort((left, right) =>
    left.orientation === right.orientation ? 0 : left.orientation === 'across' ? -1 : 1,
  );

  for (const word of acrossFirst) {
    for (const cell of word.cells) {
      const key = cellKey(cell);

      if (!written.has(key)) {
        through.set(key, [...(through.get(key) ?? []), word]);
      }
    }
  }

  return through;
};

/** What stands in a square: what was written into it, or what was typed there. */
export const letterAt = (
  key: string,
  written: ReadonlyMap<string, string>,
  typed: TypedLetters,
): string => written.get(key) ?? typed[key] ?? '';

/** How a word reads right now, `null` while any of its squares is still blank. */
export const spellingOf = (
  word: GuessableWord,
  written: ReadonlyMap<string, string>,
  typed: TypedLetters,
): string | null => {
  const spelled = word.cells.map((cell) => letterAt(cellKey(cell), written, typed));

  return spelled.includes('') ? null : spelled.join('');
};

/**
 * The word typing follows from a square: the one being filled where it reaches
 * this square, the across one otherwise
 * (`docs/decisions/0011-typing-guesses-into-the-grid.md`).
 *
 * @param words - This player's own open words through the square
 * @param activeWordId - The word they are filling in, if any
 * @param along - The way they are asking to go, when they pressed an arrow or
 * reached for a word by name. A word running that way wins over the one being
 * filled — that is the whole of switching direction with a perpendicular arrow
 * @returns The word typing runs along here, `undefined` where this player types nothing
 */
export const wordFilledAt = (
  words: readonly GuessableWord[] | undefined,
  activeWordId: string | null,
  along?: WordOrientation,
): GuessableWord | undefined => {
  const asked = along === undefined ? undefined : words?.find((word) => word.orientation === along);

  return asked ?? words?.find((word) => word.id === activeWordId) ?? words?.[0];
};

/**
 * Words whose squares are full and do not spell them. Read off the board rather
 * than remembered from a keystroke, so a word that filled up when somebody
 * else's answer crossed it is refused on exactly the same terms.
 */
export const refusedWordsOf = (
  view: GridView,
  written: ReadonlyMap<string, string>,
  typed: TypedLetters,
): readonly GuessableWord[] =>
  unsolvedOf(view).filter((word) => {
    const spelling = spellingOf(word, written, typed);

    return spelling !== null && !word.accepts(spelling);
  });

/**
 * Squares of the refused words that are theirs alone.
 *
 * A player's own two words can cross, and then the shared square carries a
 * letter of both. Taking a wrong answer back must not take that letter with it:
 * the word still standing has just as much claim to the square, and its owner
 * typed it on purpose. Once the refused word's own squares are empty it is no
 * longer full, so it stops being refused either way.
 */
export const refusedCellsOf = (
  view: GridView,
  refused: readonly GuessableWord[],
): ReadonlySet<string> => {
  const shared = new Set(
    unsolvedOf(view)
      .filter((word) => !refused.includes(word))
      .flatMap((word) => word.cells.map(cellKey)),
  );

  return new Set(
    refused.flatMap((word) => word.cells.map(cellKey)).filter((key) => !shared.has(key)),
  );
};

/**
 * Every square of the board as it stands, ready to be drawn and typed into.
 *
 * @param reading - The board, the letters on it, and the word being filled
 * @returns The squares, keyed by {@link cellKey}
 *
 * @example
 * squaresOf({ view, written, wordsOfCell, typed, activeWordId, refusedCells });
 */
export const squaresOf = ({
  view,
  written,
  wordsOfCell,
  typed,
  activeWordId,
  refusedCells,
}: BoardReading): ReadonlyMap<string, GuessEntryCell> => {
  /** The next square of a word nobody has written a letter into yet. */
  const nextEditable = (word: GuessableWord, from: number, step: -1 | 1): string | null => {
    const rest = step === 1 ? word.cells.slice(from + 1) : word.cells.slice(0, from).reverse();

    return rest.map(cellKey).find((key) => !written.has(key)) ?? null;
  };

  const drawn = new Map<string, GuessEntryCell>();

  for (const cell of view.cells) {
    const key = cellKey(cell);
    const word = wordFilledAt(wordsOfCell.get(key), activeWordId);
    const position = word?.cells.findIndex((own) => cellKey(own) === key) ?? -1;

    drawn.set(key, {
      row: cell.row,
      col: cell.col,
      letter: letterAt(key, written, typed),
      source: sourceOf(cell.content, word !== undefined),
      nextCellKey: word === undefined ? null : nextEditable(word, position, 1),
      previousCellKey: word === undefined ? null : nextEditable(word, position, -1),
      direction: word?.orientation ?? null,
      isActive: word !== undefined && word.id === activeWordId,
      isCrossing: (wordsOfCell.get(key)?.length ?? 0) > 1,
      // Refused exactly where the letters are about to be taken back, so a
      // square a second, still-standing word holds looks as it will go on looking.
      isRefused: word !== undefined && refusedCells.has(key),
    });
  }

  return drawn;
};
