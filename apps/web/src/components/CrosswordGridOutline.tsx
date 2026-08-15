import Box from '@mui/material/Box';
import { useMemo } from 'react';
import type { CrosswordLayout } from 'shared';

interface CrosswordGridOutlineProps {
  /** The room's crossword, letters and all — none of them reach the screen. */
  readonly layout: CrosswordLayout;
}

/** Side of one grid square, in pixels. */
const CELL_SIZE = 28;

const cellKey = (row: number, col: number) => `${row}:${col}`;

/**
 * The shape of the crossword: which squares exist and where — never what is in them.
 *
 * The room document carries every word in plain text, so the grid is exactly
 * where the game can be given away. This component renders no text at all: a
 * square is drawn or it is not. Which player may see which letters is decided
 * later, when words are assigned (issue #6), and no letter is shown before
 * that.
 *
 * @param props.layout - Layout stored in the room document
 *
 * @example
 * <CrosswordGridOutline layout={room.layout} />
 */
export const CrosswordGridOutline = ({ layout }: CrosswordGridOutlineProps) => {
  const filledCells = useMemo(
    () => new Set(layout.cells.map((cell) => cellKey(cell.row, cell.col))),
    [layout],
  );

  const rows = Array.from({ length: layout.rows }, (_unused, row) => row);
  const cols = Array.from({ length: layout.cols }, (_unused, col) => col);

  return (
    <Box sx={{ overflowX: 'auto', py: 1 }}>
      <Box
        role="img"
        aria-label={`Crossword grid, ${layout.rows} by ${layout.cols}, ${layout.cells.length} squares to fill. Letters are hidden.`}
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${layout.cols}, ${CELL_SIZE}px)`,
          gap: '2px',
          width: 'max-content',
        }}
      >
        {rows.map((row) =>
          cols.map((col) => (
            <Box
              key={cellKey(row, col)}
              sx={{
                height: CELL_SIZE,
                width: CELL_SIZE,
                borderRadius: '2px',
                border: filledCells.has(cellKey(row, col)) ? '1px solid' : 'none',
                borderColor: 'divider',
                backgroundColor: filledCells.has(cellKey(row, col))
                  ? 'background.paper'
                  : 'transparent',
              }}
            />
          )),
        )}
      </Box>
    </Box>
  );
};
