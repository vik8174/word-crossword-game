import {
  checkGuess,
  type GridPosition,
  numberCrossword,
  type PlacedWord,
  type WordOrientation,
} from 'shared';

import type { ReadableRoom } from './room-access';
import { isGameFinished } from './room-completion';
import { isWordSolved, wordIdAt } from './room-document';

/**
 * What one player may see of a room's words, and what the grid may draw.
 *
 * The room document carries every word in plain text and every client fetches
 * all of it (see `docs/decisions/0004-ui-only-word-visibility.md`), so this
 * module is the line between what a player is allowed to see and what would
 * spoil their game. Nothing outside it should reach for `layout.placedWords`
 * or for `layout.cells[].letter` when a player is looking.
 *
 * Typing guesses into the grid is what makes that line load-bearing: the grid
 * has to know which squares belong to the words hidden from this player, and it
 * must learn that without learning how they are spelled. So a word a player
 * guesses leaves here as coordinates plus {@link GuessableWord.accepts} — a
 * function that answers whether some letters spell it. The spelling itself
 * never crosses the boundary (see
 * `docs/decisions/0011-typing-guesses-into-the-grid.md`).
 *
 * The line is now drawn on both sides rather than on one. The words a player
 * explains are written into their grid, so what this module guarantees is not
 * that no word reaches a screen but that **no word hidden from this viewer
 * does, while the ones they explain do**
 * (`docs/decisions/0015-explained-words-in-the-grid.md`). That is why the
 * letters of an explained word are taken from {@link wordViewFor} rather than
 * read off the layout: a player the deal never covered explains nothing, and a
 * shortcut through `layout.placedWords` would hand them the whole crossword.
 */

/**
 * Where a word runs in the grid: the squares it fills, and which way.
 *
 * Says nothing about how it reads, so it is safe to hand to anybody — it is
 * what a screen needs to bring a word into view when a player names it, whether
 * that word is theirs to explain or theirs to guess. Both of those carry it.
 */
export interface WordLocation {
  readonly orientation: WordOrientation;
  /** The squares that spell it, in reading order. */
  readonly cells: readonly GridPosition[];
}

/** A word the viewer can see, and must explain to the others without saying it. */
export interface ExplainedWord extends WordLocation {
  /** Key of the word in the room's `words` map — stable across renders and updates. */
  readonly id: string;
  /**
   * The crossword number of the square it begins in.
   *
   * How the players name a word to each other out loud, and the same number the
   * grid prints in that square — both come from {@link numberCrossword}, so
   * there is one numbering rather than two that could drift.
   */
  readonly number: number;
  readonly word: string;
  /** `true` once the player it was hidden from has answered it — nothing left to explain. */
  readonly isSolved: boolean;
}

/**
 * A word hidden from the viewer: where it sits in the grid, never how it reads.
 *
 * There is deliberately no `word` field and no length beyond `cells.length`.
 * Working the spelling out is the whole of this player's game, so the only way
 * to learn anything about it from here is to propose it and be told.
 */
export interface GuessableWord extends WordLocation {
  /** Key of the word in the room's `words` map. */
  readonly id: string;
  /**
   * The crossword number of the square it begins in — safe to say to anybody,
   * since the outlines of the squares already show where the word starts. It is
   * what lets this player ask for one of their own words to be explained again.
   */
  readonly number: number;
  /** `true` once somebody has solved it — its letters are then in the grid for everyone. */
  readonly isSolved: boolean;
  /**
   * Whether the given letters spell this word.
   *
   * A closure rather than the word itself: a caller can ask, but has nothing to
   * render by accident.
   */
  readonly accepts: (guess: string) => boolean;
}

/**
 * How a room's words stand for one player. Three situations, kept apart rather
 * than folded into one shape with empty fields, because two of them must show
 * no word at all and a caller should not be able to forget that.
 *
 * - `not-dealt` — the game has not started; nobody may see anything yet
 * - `dealt` — the words are split, and these are this player's two halves
 * - `left-out` — the game is on but no word is hidden from this player, so
 *   there is nothing they could be shown without handing them the crossword,
 *   and nothing for them to type into either
 */
export type PlayerWordView =
  | { readonly kind: 'not-dealt' }
  | {
      readonly kind: 'dealt';
      /** Words hidden from someone else: this player sees them and explains them. */
      readonly toExplain: readonly ExplainedWord[];
      /** Words hidden from this player: they are the ones typing them in. */
      readonly toGuess: readonly GuessableWord[];
    }
  | { readonly kind: 'left-out' };

/** The one case that holds words, for whatever is allowed to render them. */
export type DealtWordView = Extract<PlayerWordView, { kind: 'dealt' }>;

/**
 * What a square holds, and why it holds it.
 *
 * A letter and a reason, or no letter at all — never a letter whose reason has
 * been lost. `string | null` could not tell "the group solved this" from
 * "written in for me alone", and the difference is functional rather than
 * decorative: a player who reads their own word as one the group has already
 * answered stops explaining it, and the game stalls with everybody waiting.
 *
 * The three cases are separate shapes rather than one shape with a nullable
 * letter, so a screen cannot draw an empty square holding a letter, and cannot
 * forget to ask which of the two lettered cases it is looking at.
 */
export type GridCellContent =
  /** Nothing in it: no word through it has been answered, and none is this viewer's to explain. */
  | { readonly kind: 'empty' }
  /** A word the group has answered runs through it. The same on every screen. */
  | { readonly kind: 'solved'; readonly letter: string }
  /** A word this viewer explains runs through it. On their screen alone, until it is answered. */
  | { readonly kind: 'explained'; readonly letter: string };

/** One square of the grid as it may be drawn right now. */
export interface GridCellView extends GridPosition {
  /** Its letter and where the letter comes from. */
  readonly content: GridCellContent;
  /**
   * The crossword number printed in it, `null` unless a word begins here.
   *
   * Safe on any screen: it says that a word starts in this square, which the
   * outlines of the squares already show.
   */
  readonly number: number | null;
}

/**
 * The crossword as one player's screen may draw it: the board, what is already
 * filled in, and the words this player types into.
 */
export interface GridView {
  readonly rows: number;
  readonly cols: number;
  /** Every square of the board, each saying what it holds and why. */
  readonly cells: readonly GridCellView[];
  /**
   * Words this player answers. Empty for anyone the deal did not cover, and
   * empty in a room that is no longer open for answers.
   */
  readonly toGuess: readonly GuessableWord[];
}

/**
 * How a grid square is addressed wherever a view is indexed by position.
 *
 * @param position - Row and column of the square
 * @returns A key unique to that square
 */
export const cellKey = ({ row, col }: GridPosition): string => `${row}:${col}`;

/** A placed word paired with the mutable state the game keeps for it. */
interface AssignedWord {
  readonly id: string;
  /** The number the crossword prints in the square it begins in. */
  readonly number: number;
  readonly placed: PlacedWord;
  /** UID of the player who has to guess it — the reason this entry exists. */
  readonly hiddenFrom: string;
  readonly isSolved: boolean;
}

/**
 * The room's words that have actually been dealt to somebody, each with its number.
 *
 * A word whose `hiddenFromPlayerId` is missing, `null`, or something another
 * client wrote nonsense into belongs to nobody and is dropped here, so no
 * caller downstream has to wonder what an unassigned word means.
 *
 * A word occupying no square at all is dropped for the same reason: it carries
 * no number, has nowhere to be drawn and nowhere to be typed, so an entry for
 * it would only be a line in a panel that names nothing on the board. The
 * generator produces no such word; a layout read back out of a document another
 * client wrote is where one could come from.
 */
const assignedWordsOf = (room: ReadableRoom): readonly AssignedWord[] => {
  const numbers = new Map(
    numberCrossword(room.layout.placedWords).map(({ wordIndex, number }) => [wordIndex, number]),
  );

  return room.layout.placedWords
    .map((placed, index) => {
      const id = wordIdAt(index);
      const state = room.words[id];

      return {
        id,
        number: numbers.get(index),
        placed,
        hiddenFrom: state?.hiddenFromPlayerId,
        isSolved: isWordSolved(state),
      };
    })
    .filter(
      (entry): entry is AssignedWord =>
        typeof entry.hiddenFrom === 'string' && entry.number !== undefined,
    );
};

const guessableFrom = ({ id, number, placed, isSolved: solved }: AssignedWord): GuessableWord => ({
  id,
  number,
  orientation: placed.orientation,
  cells: placed.cells,
  isSolved: solved,
  accepts: (guess: string) => checkGuess(guess, placed.word),
});

const explainableFrom = ({
  id,
  number,
  placed,
  isSolved: solved,
}: AssignedWord): ExplainedWord => ({
  id,
  number,
  orientation: placed.orientation,
  word: placed.word,
  cells: placed.cells,
  isSolved: solved,
});

/**
 * Splits a room's words into the ones this player explains and the ones they guess.
 *
 * A player of a game that is on always has at least one word hidden from them:
 * `assignWords` refuses to deal a crossword with fewer words than players. So
 * having none is not a thin share of the game — it means this player was not in
 * the deal, and every word of the crossword is one they may "explain". That
 * happens for real: somebody who joined between the owner reading the room and
 * the owner writing the deal is in the room but not in the assignment, a race
 * no client can close and no security rule can catch (the rules cannot walk the
 * `words` map). It is reported as `left-out`, and nothing is shown — nor is
 * anything theirs to type into.
 *
 * A word not yet assigned belongs to neither half, so a room in the lobby shows
 * nobody anything. A word assigned to a player who is not in the room — nothing
 * in the security rules prevents another client from writing that — reads as
 * somebody else's word to guess, and is therefore spelled out to everybody,
 * including whoever was meant to guess it. That is the trust boundary
 * `docs/decisions/0004-ui-only-word-visibility.md` accepts: a client already in
 * a room can spoil the game for the room it is in, and no reading of the
 * document can tell that write apart from an honest one.
 *
 * @param room - The room document as read from Firestore
 * @param viewerId - Firebase Auth UID of the player looking at the screen
 * @returns Which of the three situations this player is in, with their words if any
 *
 * @example
 * wordViewFor(room, playerId); // { kind: 'dealt', toExplain: [...], toGuess: [...] }
 */
export const wordViewFor = (room: ReadableRoom, viewerId: string): PlayerWordView => {
  const assigned = assignedWordsOf(room);

  if (room.status === 'lobby' || assigned.length === 0) {
    return { kind: 'not-dealt' };
  }

  const toGuess = assigned.filter((entry) => entry.hiddenFrom === viewerId).map(guessableFrom);

  if (toGuess.length === 0) {
    return { kind: 'left-out' };
  }

  return {
    kind: 'dealt',
    toExplain: assigned.filter((entry) => entry.hiddenFrom !== viewerId).map(explainableFrom),
    toGuess,
  };
};

/**
 * Every word of the crossword, spelled out — but only once the game really is over.
 *
 * The one place a word hidden from the reader may be named to them, so what
 * makes it safe has to be something the room cannot lie about. A `completed`
 * status alone is not that: the security rules cannot walk the `words` map to
 * check it, so any client that knows the room id can write it over a game that
 * was never played, and this would then read the whole word list out. What is
 * asked instead is {@link isGameFinished} — the status *and* an answer against
 * every word. Then the letters are already in the grid on every screen and
 * there is nothing here anybody could still be working out.
 *
 * The guard lives here rather than in the caller for the same reason the rest
 * of this module does — a component that renders whatever it is handed must not
 * be the thing deciding whether the game is over.
 *
 * @param room - The room document as read from Firestore
 * @returns The words in grid order, or nothing at all unless the crossword is full
 *
 * @example
 * finishedWordsOf(room); // ['cat', 'car', 'rat']
 */
export const finishedWordsOf = (room: ReadableRoom): readonly string[] =>
  isGameFinished(room) ? room.layout.placedWords.map(({ word }) => word) : [];

/**
 * The squares of the words the group has already answered.
 *
 * Solved words are shared progress, so this does not depend on who is looking —
 * the answered part of the grid is the same on every screen, which is what lets
 * a player tell it apart from the part only they can see
 * (`docs/decisions/0015-explained-words-in-the-grid.md`).
 */
const solvedCellKeys = (room: ReadableRoom): ReadonlySet<string> =>
  new Set(
    room.layout.placedWords
      .filter((_placed, index) => isWordSolved(room.words[wordIdAt(index)]))
      .flatMap((placed) => placed.cells.map(cellKey)),
  );

/**
 * The squares of the words this viewer explains, keyed by {@link cellKey}.
 *
 * Taken from the view rather than from the layout, and that is the whole of its
 * safety: a player the deal never covered explains nothing, and asking
 * `layout.placedWords` which words are "not hidden from me" would answer *all
 * of them* and write the crossword out in front of them.
 */
const explainedCellKeys = (view: PlayerWordView): ReadonlySet<string> =>
  new Set(view.kind === 'dealt' ? view.toExplain.flatMap(({ cells }) => cells.map(cellKey)) : []);

/**
 * What a square holds, given what the group has answered and what this viewer explains.
 *
 * Solved comes first where a square is both. That is what moves a word from
 * "only I can see this" to "the group has this" the moment its guesser answers
 * it: the same letter, drawn for a different reason, on every screen at once.
 */
const contentOf = (letter: string, isSolved: boolean, isExplained: boolean): GridCellContent => {
  if (isSolved) {
    return { kind: 'solved', letter };
  }

  if (isExplained) {
    return { kind: 'explained', letter };
  }

  return { kind: 'empty' };
};

/**
 * The number printed in each square that begins a word, keyed by {@link cellKey}.
 *
 * Worked out from the layout on every screen rather than read from the document
 * (see {@link numberCrossword}), and the same on all of them for the same
 * reason the board is: the layout is written once, when the room is created.
 */
const numberedCellKeys = (room: ReadableRoom): ReadonlyMap<string, number> =>
  new Map(
    numberCrossword(room.layout.placedWords).map(({ start, number }) => [cellKey(start), number]),
  );

/**
 * The crossword as this player's screen may draw it.
 *
 * A square keeps its letter when a solved word runs through it, and when a word
 * this player explains does — and it says which of the two it is, so the screen
 * can draw them apart. Every other square arrives empty, so a component that
 * renders whatever it is handed cannot give a word away — including the words
 * it lets this player type into, which come with coordinates and no spelling.
 *
 * The letters of an explained word do fill squares of words hidden from this
 * player, wherever the two cross. That is measured and accepted rather than
 * overlooked: `docs/decisions/0015-explained-words-in-the-grid.md` carries the
 * numbers. What is *not* accepted, and is what this function exists to prevent,
 * is a letter of a word hidden from the viewer arriving from anywhere else.
 *
 * Its number comes with it, because the numbers are how the players name the
 * words to each other and every screen must carry the same ones.
 *
 * A closed room hands over nothing to type. In a game that ended the ordinary
 * way this changes nothing — every word is answered, so there is nowhere left
 * to type anyway — but a room closed with words still open is finished with its
 * players all the same, and a grid that went on taking answers under a notice
 * saying the room is closed would be lying to them.
 *
 * @param room - The room document as read from Firestore
 * @param viewerId - Firebase Auth UID of the player looking at the screen
 * @returns The board, the letters that may be shown, and this player's own words
 *
 * @example
 * gridViewFor(room, playerId); // { rows: 9, cols: 9, cells: [...], toGuess: [...] }
 */
export const gridViewFor = (room: ReadableRoom, viewerId: string): GridView => {
  const solved = solvedCellKeys(room);
  const numbers = numberedCellKeys(room);
  const view = wordViewFor(room, viewerId);
  const explained = explainedCellKeys(view);
  const isOpenForAnswers = room.status === 'playing';

  return {
    rows: room.layout.rows,
    cols: room.layout.cols,
    cells: room.layout.cells.map(({ row, col, letter }) => {
      const key = cellKey({ row, col });

      return {
        row,
        col,
        content: contentOf(letter, solved.has(key), explained.has(key)),
        number: numbers.get(key) ?? null,
      };
    }),
    toGuess: view.kind === 'dealt' && isOpenForAnswers ? view.toGuess : [],
  };
};
