import { checkGuess, type GridPosition, type PlacedWord, type WordOrientation } from 'shared';

import type { ReadableRoom } from './room-access';
import { wordIdAt, type RoomWordState } from './room-document';

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
 */

/** A word the viewer can see, and must explain to the others without saying it. */
export interface ExplainedWord {
  /** Key of the word in the room's `words` map — stable across renders and updates. */
  readonly id: string;
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
export interface GuessableWord {
  /** Key of the word in the room's `words` map. */
  readonly id: string;
  readonly orientation: WordOrientation;
  /** The squares that spell it, in reading order. */
  readonly cells: readonly GridPosition[];
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

/** One square of the grid as it may be drawn right now. */
export interface GridCellView extends GridPosition {
  /** Its letter once a solved word passes through it, `null` while none does. */
  readonly letter: string | null;
}

/**
 * The crossword as one player's screen may draw it: the board, what is already
 * filled in, and the words this player types into.
 */
export interface GridView {
  readonly rows: number;
  readonly cols: number;
  /** Every square that holds a letter, whether or not that letter may be shown. */
  readonly cells: readonly GridCellView[];
  /** Words this player answers. Empty for anyone the deal did not cover. */
  readonly toGuess: readonly GuessableWord[];
}

/**
 * How a grid square is addressed wherever a view is indexed by position.
 *
 * @param position - Row and column of the square
 * @returns A key unique to that square
 */
export const cellKey = ({ row, col }: GridPosition): string => `${row}:${col}`;

/** A word state only counts as solved when it names who solved it. */
const isSolved = (state: RoomWordState | undefined): boolean =>
  typeof state?.guessedByPlayerId === 'string' && state.guessedByPlayerId.length > 0;

/** A placed word paired with the mutable state the game keeps for it. */
interface AssignedWord {
  readonly id: string;
  readonly placed: PlacedWord;
  /** UID of the player who has to guess it — the reason this entry exists. */
  readonly hiddenFrom: string;
  readonly isSolved: boolean;
}

/**
 * The room's words that have actually been dealt to somebody.
 *
 * A word whose `hiddenFromPlayerId` is missing, `null`, or something another
 * client wrote nonsense into belongs to nobody and is dropped here, so no
 * caller downstream has to wonder what an unassigned word means.
 */
const assignedWordsOf = (room: ReadableRoom): readonly AssignedWord[] =>
  room.layout.placedWords
    .map((placed, index) => {
      const id = wordIdAt(index);
      const state = room.words[id];

      return { id, placed, hiddenFrom: state?.hiddenFromPlayerId, isSolved: isSolved(state) };
    })
    .filter((entry): entry is AssignedWord => typeof entry.hiddenFrom === 'string');

const guessableFrom = ({ id, placed, isSolved: solved }: AssignedWord): GuessableWord => ({
  id,
  orientation: placed.orientation,
  cells: placed.cells,
  isSolved: solved,
  accepts: (guess: string) => checkGuess(guess, placed.word),
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
    toExplain: assigned
      .filter((entry) => entry.hiddenFrom !== viewerId)
      .map(({ id, placed, isSolved: solved }) => ({ id, word: placed.word, isSolved: solved })),
    toGuess,
  };
};

/**
 * The squares whose letters may be shown: those of words already solved.
 *
 * Solved words are shared progress, so this does not depend on who is looking —
 * the filled-in part of the grid is the same on every screen
 * (`docs/decisions/0010-letterless-grid-and-private-word-list.md`).
 */
const solvedCellKeys = (room: ReadableRoom): ReadonlySet<string> =>
  new Set(
    room.layout.placedWords
      .filter((_placed, index) => isSolved(room.words[wordIdAt(index)]))
      .flatMap((placed) => placed.cells.map(cellKey)),
  );

/**
 * The crossword as this player's screen may draw it.
 *
 * A square keeps its letter only once a solved word runs through it. Everything
 * else arrives as `null`, so a component that renders whatever it is handed
 * cannot give a word away — including the words it lets this player type into,
 * which come with coordinates and no spelling.
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
  const view = wordViewFor(room, viewerId);

  return {
    rows: room.layout.rows,
    cols: room.layout.cols,
    cells: room.layout.cells.map(({ row, col, letter }) => ({
      row,
      col,
      letter: solved.has(cellKey({ row, col })) ? letter : null,
    })),
    toGuess: view.kind === 'dealt' ? view.toGuess : [],
  };
};
