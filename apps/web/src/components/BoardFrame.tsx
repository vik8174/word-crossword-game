import Box from '@mui/material/Box';
import type { ComponentProps, ReactNode } from 'react';

import {
  type BandAbove,
  type BoardShape,
  boardHeightsFor,
  boardVariables,
  CELL_GAP,
  cellSizeVariable,
  GRID_COLUMNS_CSS,
} from './board-geometry';
import {
  APP_SHELL,
  BOX_AT_ITS_GRID,
  NARROW_WINDOW,
  TABLET_WINDOW,
  THREE_ZONES,
} from './room-layout';

interface BoardFrameProps {
  /** How many squares the board has across and down, which its own height and the size of a square are worked from. */
  readonly shape: BoardShape;
  /** What the room draws above the board, so the board is given the share of the window that is left. */
  readonly bandAbove: BandAbove;
  /** Whether anything is written under the board. A screen with nothing there takes back the space it would open. */
  readonly hasNotes: boolean;
  /** The grid's own accessible name, its role and, for a board that takes keys, its handler. */
  readonly group: Pick<ComponentProps<typeof Box>, 'role' | 'aria-label' | 'onKeyDown'>;
  /** Every square of the board, row by row. */
  readonly squares: ReactNode;
  /** Whatever stands under the board: announcements and notes. */
  readonly children?: ReactNode;
}

/**
 * The patch of the page a crossword stands on, whichever crossword it is: the
 * player's own (`CrosswordGrid`) and the teacher's (`TeacherGrid`).
 *
 * It holds everything that decides how large the board is and none of what is
 * in it, so the two boards are the same size in the same window for the same
 * crossword (`board-geometry.ts`).
 *
 * @param props.shape - The crossword's size in squares
 * @param props.bandAbove - What stands above the board
 * @param props.hasNotes - Whether anything stands under it
 * @param props.group - The grid's role, name and key handler
 * @param props.squares - The squares
 * @param props.children - What stands under the board
 */
export const BoardFrame = ({
  shape,
  bandAbove,
  hasNotes,
  group,
  squares,
  children,
}: BoardFrameProps) => {
  const heights = boardHeightsFor(bandAbove);
  // No drawing above the board: the game. From 1200 by 600 the board stands in
  // the middle of the zone's free height and the notes at its foot, as the
  // template has it (`.zone-middle.fill > .board-wrap { margin: auto 0 }`).
  const isCentred = bandAbove === 'none';

  return (
    <Box
      sx={{
        py: 2,
        ...(isCentred
          ? {
              // The zone's own ring of padding is all the room the squares' shadows need.
              [THREE_ZONES]: {
                py: 0,
                display: 'flex',
                flexDirection: 'column',
                flex: '1 0 auto',
              },
            }
          : {}),
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
          ...boardVariables(shape),
          containerType: 'size',
          height: heights.phone,
          overflow: 'auto',
          [NARROW_WINDOW]: { height: heights.narrow },
          [APP_SHELL]: { height: heights.appShell },
          [TABLET_WINDOW]: { height: heights.tablet },
          [THREE_ZONES]: {
            height: heights.wide,
            // Automatic margins share what the column has left above and below
            // the board, and come out as nothing when the board and its notes
            // are taller than the zone: the board then starts at the top and
            // the zone scrolls, as it always has.
            ...(isCentred
              ? { flexShrink: 0, marginBlock: 'auto', display: 'flex', flexDirection: 'column' }
              : {}),
          },
        }}
      >
        <Box
          {...group}
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
            // A box taller than its grid (the list is wide for the zone, so the
            // squares are sized by the width and the box keeps its height) holds
            // the grid in its middle, so the centring above is of the grid and
            // not of an empty strip under it. Taller than the box, the margins
            // come out as nothing and the box scrolls from its first row.
            ...(isCentred ? { [THREE_ZONES]: { marginBlock: 'auto', flexShrink: 0 } } : {}),
          }}
        >
          {squares}
        </Box>
      </Box>

      {children}
    </Box>
  );
};
