import Box from '@mui/material/Box';
import { type SxProps, type Theme } from '@mui/material/styles';
import { type CSSProperties, useMemo } from 'react';

import { SQUARE_FACE_CLASS } from '../motion';
import { useTurnedSquares } from '../rooms/use-turned-squares';
import {
  cellKey,
  type WatchedCell,
  type WatchedGridView,
  type WatchedSquareFace,
} from '../rooms/word-visibility';
import { STREET } from '../street';
import { type BandAbove, CELL_SIDE } from './board-geometry';
import { NOTE_SX, NOTES_SX } from './board-note-styles';
import { BoardFrame } from './BoardFrame';
import { ANSWERED_SQUARE_SX, NUMBER_SX, SQUARE_BASE_SX, TICK_SX } from './square-styles';
import { Swatch } from './Swatch';
import { OUTLINE_WIDTH } from './surface-styles';

/**
 * How a square of each face is drawn on the teacher's board
 * (`.cell.t-a`, `.cell.t-b` and `.cell.guessed`, `design/templates/state-tree.html`
 * lines 198-199 and 298-299).
 *
 * The left student's words are on `wash` with the ordinary ink ring and italic
 * letters; the right student's are on `stone` with a dotted outline in place of
 * the ring and italic letters; an answered square is the answered square of
 * every other board, in `sage`, with its spruce ring, its tick and letters in
 * 700. Three cues for each, so none is told from another by its fill alone.
 */
const FACE_SX: Record<WatchedSquareFace, SxProps<Theme>> = {
  left: { backgroundColor: STREET.wash, fontStyle: 'italic' },
  right: {
    backgroundColor: STREET.stone,
    boxShadow: 'none',
    outline: `${OUTLINE_WIDTH}px dotted ${STREET.ink}`,
    outlineOffset: `-${OUTLINE_WIDTH}px`,
    fontStyle: 'italic',
  },
  answered: {
    backgroundColor: (theme: Theme) => theme.palette.grid.guessed,
    ...(ANSWERED_SQUARE_SX as object),
  },
};

interface TeacherSquareProps {
  readonly cell: WatchedCell;
  /** Where this square stands in the word that was answered while the board was on the screen, when it turned over because of it. */
  readonly turnPlace?: number;
}

/**
 * One square of the teacher's board: a letter, its number, and whose it is.
 *
 * Nothing but a box. A square of this board is not an input and not a stop for
 * the Tab key, takes no focus, no click and no key, and shows no cursor: the
 * teacher plays nothing, so there is nothing on this board for them to do
 * (`docs/decisions/0037-a-lesson-is-run-by-a-teacher-who-does-not-play.md`).
 * It is built as `GridSquare` is, a box with the marks that sit over it (the
 * tick, the number) on the one round it, so the same word turns over the same
 * way on both boards.
 */
const TeacherSquare = ({ cell, turnPlace }: TeacherSquareProps) => {
  const isTurning = cell.face === 'answered' && turnPlace !== undefined;

  return (
    <Box
      className={isTurning ? 'cell just' : undefined}
      style={isTurning ? ({ '--d': turnPlace } as CSSProperties) : undefined}
      sx={{
        position: 'relative',
        height: CELL_SIDE,
        width: CELL_SIDE,
        ...(cell.face === 'answered' ? { '&::after': TICK_SX } : {}),
      }}
    >
      <Box
        className={SQUARE_FACE_CLASS}
        sx={{ ...SQUARE_BASE_SX, ...(FACE_SX[cell.face] as object) }}
      >
        {cell.letter}
      </Box>
      {cell.number !== null && (
        <Box component="span" aria-hidden="true" sx={NUMBER_SX}>
          {cell.number}
        </Box>
      )}
    </Box>
  );
};

interface TeacherGridProps {
  /** The board as the teacher sees it, from `watchedGridFor`. */
  readonly view: WatchedGridView;
  /** The nickname of the student who explains the words on `wash`. */
  readonly leftName: string;
  /** The nickname of the student who explains the words on `stone`. */
  readonly rightName: string;
  /**
   * The squares of every answered word, in the order each word runs. A word that
   * appears here while the board is on the screen turns its squares over once
   * (`useTurnedSquares`); one that was here when the board opened does not.
   */
  readonly answeredWords: readonly (readonly string[])[];
  /** What the room draws above the board, so the board is given the share of the window that is left. */
  readonly bandAbove: BandAbove;
}

/**
 * The crossword as a lesson's teacher watches it: every word in its place, the
 * answered ones plain and the rest marked by who explains them, and the legend
 * under it that says which mark is whose
 * (`playing`, `?mode=lesson&role=host`, template lines 996-1006).
 *
 * It is the player's board without the playing. The same frame decides how large
 * a square is (`BoardFrame`), the squares are drawn from the same styles
 * (`square-styles.ts`), and what is different is that none of them takes
 * anything: no square is in the tab order, none shows a cursor, and typing on
 * the page changes none of them. The board is named once, as a picture, because
 * the words it holds are listed in full beside it.
 *
 * @param props.view - The squares, from {@link watchedGridFor}
 * @param props.leftName - Whose words are on `wash`
 * @param props.rightName - Whose words are on `stone`
 * @param props.answeredWords - The squares of the answered words, to turn over the ones answered while watching
 * @param props.bandAbove - What stands above the board
 *
 * @example
 * <TeacherGrid view={watchedGridFor(room, teacherId)} leftName="Olena" rightName="Taras" answeredWords={[]} bandAbove="none" />
 */
export const TeacherGrid = ({
  view,
  leftName,
  rightName,
  answeredWords,
  bandAbove,
}: TeacherGridProps) => {
  const turned = useTurnedSquares(answeredWords);
  const cells = useMemo(() => new Map(view.cells.map((cell) => [cellKey(cell), cell])), [view]);
  const answeredSquares = view.cells.filter((cell) => cell.face === 'answered').length;
  const rows = Array.from({ length: view.rows }, (_unused, row) => row);
  const cols = Array.from({ length: view.cols }, (_unused, col) => col);

  const renderCell = (row: number, col: number) => {
    const key = cellKey({ row, col });
    const cell = cells.get(key);

    // A square the crossword does not use still takes a square's worth of room,
    // from the same variable, or a row of holes would pull the grid apart.
    return cell === undefined ? (
      <Box key={key} sx={{ height: CELL_SIDE, width: CELL_SIDE }} />
    ) : (
      <TeacherSquare key={key} cell={cell} turnPlace={turned.get(key)} />
    );
  };

  return (
    <BoardFrame
      shape={view}
      bandAbove={bandAbove}
      hasNotes
      group={{
        role: 'img',
        'aria-label': `Crossword grid, ${view.rows} by ${view.cols}, ${view.cells.length} squares, every word shown, ${answeredSquares} of the squares answered`,
      }}
      squares={rows.map((row) => cols.map((col) => renderCell(row, col)))}
    >
      <Box sx={NOTES_SX}>
        <Box component="p" sx={NOTE_SX}>
          <Swatch face="left" />
          {`${leftName} explains · `}
          <Swatch face="right" />
          {`${rightName} explains · bold letters are answered`}
        </Box>
      </Box>
    </BoardFrame>
  );
};
