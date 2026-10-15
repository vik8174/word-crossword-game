import Box from '@mui/material/Box';
import { type SxProps, type Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { type KeyboardEvent, useEffect, useMemo, useRef } from 'react';

import type { GuessEntryCell } from '../rooms/guess-board';
import { isArrowKey, useGridCursor } from '../rooms/use-grid-cursor';
import { useGuessEntry } from '../rooms/use-guess-entry';
import { useTurnedSquares } from '../rooms/use-turned-squares';
import { cellKey, type GridView, type WordLocation } from '../rooms/word-visibility';
import { inRem } from '../scale';
import { STREET } from '../street';
import {
  type BandAbove,
  boardHeightsFor,
  boardVariables,
  CELL_GAP,
  CELL_SIDE,
  cellSizeVariable,
  GRID_COLUMNS_CSS,
} from './board-geometry';
import { GridSquare } from './GridSquare';
import {
  APP_SHELL,
  BOX_AT_ITS_GRID,
  NARROW_WINDOW,
  TABLET_WINDOW,
  THREE_ZONES,
} from './room-layout';

/** One line under the board (`.board-note`): 15px, slate, centred. */
const NOTE_SX = {
  margin: 0,
  fontSize: inRem(15),
  lineHeight: 1.6,
  color: STREET.slate,
  textAlign: 'center',
} as const;

/** Text that is read out but not drawn — for what the grid says in colour alone. */
const SPOKEN_ONLY: SxProps<Theme> = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
};

/** The same empty list every time, so a board with nothing to turn is not redrawn for it. */
const NO_ANSWERED_WORDS: readonly (readonly string[])[] = [];

const REFUSAL_MESSAGE =
  'That is not the word. The letters clear in a moment. Try again as often as you like.';

/** Said only to a player who actually has two words of their own crossing. */
const CROSSING_HINT =
  'Two of your words cross. On the shared square, click it again or press the space bar to swap between them.';

/** How the board is played from the keyboard, once a square has been taken up. */
const KEYBOARD_HINT =
  'The arrow keys move around the whole grid, square by square. Backspace clears the square you are in, or steps back when it is already empty.';

interface CrosswordGridProps {
  /** The board as this player may see it, already stripped of every unearned letter. */
  readonly view: GridView;
  /** Records a word this player has just answered. */
  readonly onSolved: (wordId: string) => Promise<void>;
  /**
   * A word to go to, as a player naming one from the panel asks for.
   *
   * It is the value arriving anew that is the request, so asking for the same
   * word twice means handing over a second value equal to the first — which is
   * what lets a player tap an entry, wander off across the grid, and tap it
   * again to come back.
   */
  readonly wordToReach?: WordLocation | null;
  /**
   * What the room draws above the board, so the board is given the share of the
   * window that is left once the drawing has taken its height (see
   * `board-geometry.ts`).
   */
  readonly bandAbove?: BandAbove;
  /**
   * The squares of every word the group has answered, in the order each word
   * runs. A word that appears here while the board is on the screen turns its
   * squares over once (`useTurnedSquares`); one that was here when the board
   * opened does not.
   */
  readonly answeredWords?: readonly (readonly string[])[];
}

/**
 * The crossword: the squares that exist, the letters this player may see, and
 * the ones they are filling in.
 *
 * The room document carries every word in plain text, so the grid is exactly
 * where the game can be given away. This component is handed no word and no
 * letter that is not already this player's to see: `gridViewFor` decides what
 * may be drawn and hands over the squares of this player's own words as bare
 * coordinates (`docs/decisions/0011-typing-guesses-into-the-grid.md`).
 *
 * A square is therefore blank, or a box this player types into, or it holds a
 * letter — and a letter arrives saying which of two things it is: a word the
 * group has answered, or a word this player explains, written in for them alone
 * (`docs/decisions/0015-explained-words-in-the-grid.md`). Those two are drawn
 * apart by an outline and a slant as well as by a tint, because telling them
 * apart is what keeps a player explaining a word nobody has guessed yet. There
 * is nothing here that could render a fifth thing by mistake.
 *
 * What it holds of its own is where the player is: the cursor, which crosses
 * every square of the board whoever owns it, and which the browser's focus
 * follows rather than decides
 * (`docs/decisions/0016-the-cursor-lives-in-the-grid.md`). The board is one
 * stop for the Tab key, and the arrows move within it.
 *
 * One thing a square may carry whatever else it is doing: the crossword number
 * of the word that begins in it, which is how the players name a word to each
 * other out loud. It gives nothing away — where the words begin and how long
 * they are is already drawn in the outlines of the squares.
 *
 * @param props.view - What this player's screen may draw, from `gridViewFor`
 * @param props.onSolved - Called once a word of theirs has been answered
 * @param props.wordToReach - A word the player asked to be taken to
 * @param props.bandAbove - What the room draws above the board, if anything
 *
 * @example
 * <CrosswordGrid view={gridViewFor(room, viewerId)} onSolved={submitGuess} />
 */
export const CrosswordGrid = ({
  view,
  onSolved,
  wordToReach,
  bandAbove = 'none',
  answeredWords = NO_ANSWERED_WORDS,
}: CrosswordGridProps) => {
  const heights = boardHeightsFor(bandAbove);
  const entry = useGuessEntry(view, onSolved);
  const turned = useTurnedSquares(answeredWords);
  const cursor = useGridCursor(entry, view);
  // Held in a ref rather than watched as a dependency: what asks for a word is
  // the player tapping the panel, never the grid redrawing around them.
  const reach = useRef(cursor.reach);

  useEffect(() => {
    reach.current = cursor.reach;
  });

  useEffect(() => {
    if (wordToReach !== undefined && wordToReach !== null) {
      reach.current(wordToReach);
    }
  }, [wordToReach]);

  /** The crossword numbers, by square — no square is numbered but a word's first. */
  const numbers = useMemo(
    () =>
      new Map(
        view.cells.flatMap((cell) =>
          cell.number === null ? [] : [[cellKey(cell), cell.number] as const],
        ),
      ),
    [view],
  );

  /**
   * The square the Tab key lands on before the player has taken one up: the
   * first they can type in, or the first there is. Afterwards the cursor is the
   * one stop, so the grid never holds two.
   */
  const firstTabStop = useMemo(() => {
    const squares = [...entry.cells.values()];

    return squares.find((cell) => cell.source === 'own') ?? squares[0];
  }, [entry.cells]);

  /** Whether this player has a square of their own left at all — a lobby has none. */
  const hasSquaresToFill = firstTabStop?.source === 'own';
  const rows = Array.from({ length: view.rows }, (_unused, row) => row);
  const cols = Array.from({ length: view.cols }, (_unused, col) => col);
  const filledIn = [...entry.cells.values()].filter((cell) => cell.letter !== '').length;

  const handleTyped = (cell: GuessEntryCell) => (letter: string) => {
    entry.type(cell, letter);

    const next = cell.nextCellKey === null ? undefined : entry.cells.get(cell.nextCellKey);

    // Typing runs along the word being filled rather than along the row, so a
    // down word can be entered without reaching for the mouse between letters.
    if (letter !== '' && next !== undefined) {
      cursor.moveTo({ row: next.row, col: next.col });
    }
  };

  // Clicking a square already under the cursor is what swaps between the two
  // words crossing there — the classic crossword gesture. The first click on a
  // square only picks it up, which is what the cursor being state rather than
  // focus makes plain: it has not arrived yet.
  const handlePressed = (cell: GuessEntryCell) => () => {
    if (cursor.key === cellKey(cell)) {
      entry.switchWordAt(cell);
    }
  };

  const handleTakenUp = (cell: GuessEntryCell) => () =>
    cursor.moveTo({ row: cell.row, col: cell.col });

  /**
   * Everything the keyboard does to the board, read where the board is rather
   * than on each square: the keys move the cursor, and the cursor is the grid's.
   */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (cursor.at === null) {
      return;
    }

    // A space is not a letter and had nothing else to do, so it swaps between
    // two crossing words — the same gesture as the second click, from the keys.
    if (event.key === ' ') {
      event.preventDefault();
      entry.switchWordAt(cursor.at);

      return;
    }

    if (isArrowKey(event.key)) {
      event.preventDefault();
      cursor.moveBy(event.key);

      return;
    }

    if (event.key === 'Backspace') {
      // Taken over from the input under the cursor: a backspace on an empty
      // square has to step back along the word, which no single input can do.
      event.preventDefault();
      cursor.eraseBack();
    }
  };

  const renderCell = (row: number, col: number) => {
    const key = cellKey({ row, col });
    const cell = entry.cells.get(key);

    if (cell === undefined) {
      // A square the crossword does not use still takes a square's worth of
      // room, and takes it from the same variable — a row of holes drawn at
      // some other size would pull the grid apart wherever a row is not full.
      return <Box key={key} sx={{ height: CELL_SIDE, width: CELL_SIDE }} />;
    }

    return (
      <GridSquare
        key={key}
        cell={cell}
        number={numbers.get(key) ?? null}
        isCursor={cursor.key === key}
        isTabStop={cursor.key === null && firstTabStop === cell}
        turnPlace={turned.get(key)}
        onTyped={handleTyped(cell)}
        onTakenUp={handleTakenUp(cell)}
        onPressed={handlePressed(cell)}
      />
    );
  };

  /** Whether anything is written under the board: a hint, or a word about a refused answer. */
  const hasNotes = entry.hasRefusal || hasSquaresToFill || entry.hasCrossings;

  return (
    <Box
      sx={{
        py: 2,
        // On a phone held upright, or a tablet, the box below is as tall as its grid, which it
        // can only be if it knows its own width: this is the container whose
        // width that is (`NARROW_BOARD_HEIGHT_CSS`). A screen with nothing under
        // the board (a viewer left out, a finished game) draws no space under
        // it either: the next zone stands the template's 28px away and not 52.
        [BOX_AT_ITS_GRID]: { containerType: 'inline-size', ...(hasNotes ? {} : { pb: 0 }) },
      }}
    >
      {/*
        The board's own patch of the page, and the thing every square is
        measured against: it is declared a CSS container, and the size of a
        square is a sum over the room it has (`board-geometry.ts`). Its height
        is given to it rather than taken from its contents, because a container
        that reports its height has to have one settled without them — and it is
        a larger share of the window on the screen where the board has a column
        to itself.

        It scrolls in both directions and not only across. Which axis runs out
        is not fixed — a phone runs out of width, a board given a desktop's
        column runs out of height — and a board cut off at the bottom is a board
        with words nobody can reach.
      */}
      <Box
        sx={{
          ...boardVariables(view),
          containerType: 'size',
          height: heights.phone,
          overflow: 'auto',
          [NARROW_WINDOW]: { height: heights.narrow },
          [APP_SHELL]: { height: heights.appShell },
          [TABLET_WINDOW]: { height: heights.tablet },
          [THREE_ZONES]: { height: heights.wide },
        }}
      >
        <Box
          role="group"
          aria-label={`Crossword grid, ${view.rows} by ${view.cols}, ${entry.cells.size} squares, ${filledIn} of them filled in`}
          onKeyDown={handleKeyDown}
          sx={{
            ...cellSizeVariable,
            display: 'grid',
            gridTemplateColumns: GRID_COLUMNS_CSS,
            gap: `${CELL_GAP}px`,
            width: 'max-content',
            // Centred in a zone wider than the crossword, and pushed to neither
            // side of one that is narrower: automatic margins on a block wider
            // than what holds it come out as nothing, so the scroll still starts
            // at the first column rather than in the middle of the board.
            mx: 'auto',
          }}
        >
          {rows.map((row) => cols.map((col) => renderCell(row, col)))}
        </Box>
      </Box>

      {/*
        Swapping between two crossing words moves nothing and reveals nothing —
        the only sign of it is which way the next letter will go, which is a
        colour. Said here as well, so the gesture works for a reader who cannot
        see the grid. Announced rather than shown: the direction is already
        plain to anyone looking.
      */}
      <Typography aria-live="polite" sx={SPOKEN_ONLY}>
        {entry.activeDirection === null ? '' : `Now filling ${entry.activeDirection}.`}
      </Typography>

      {/*
        The board's notes (`.board-notes`, `state-tree.html` lines 806-811): at
        most 560px wide, centred, 16px under the board and 6px apart, the word
        about a refused answer first.

        That word is kept under the board rather than moved to a zone beside it:
        it is the only word a player gets about an answer that was not accepted,
        and it has to be where they were looking when they typed it. It is a
        live region, which only speaks when the text inside one that was already
        there changes, so it is an empty line and never an absent one. While it
        is empty it takes back the gap it would have opened, so a board with
        nothing to say under it has no space under it for nothing.
      */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: inRem(6),
          maxWidth: inRem(560),
          margin: `${inRem(16)} auto 0`,
          // An empty line opens no gap of its own, so it opens no margin either.
          ...(hasNotes ? {} : { [BOX_AT_ITS_GRID]: { marginTop: 0 } }),
        }}
      >
        <Typography
          role="status"
          sx={{
            ...NOTE_SX,
            ...(entry.hasRefusal
              ? { color: STREET.brick, fontWeight: 700, fontSize: inRem(17) }
              : { marginBottom: inRem(-6) }),
          }}
        >
          {entry.hasRefusal ? REFUSAL_MESSAGE : ''}
        </Typography>

        {hasSquaresToFill && <Typography sx={NOTE_SX}>{KEYBOARD_HINT}</Typography>}

        {entry.hasCrossings && <Typography sx={NOTE_SX}>{CROSSING_HINT}</Typography>}
      </Box>
    </Box>
  );
};
