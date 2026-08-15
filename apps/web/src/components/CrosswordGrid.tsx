import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useRef, type ChangeEvent } from 'react';

import { useGuessEntry, type GuessEntryCell } from '../rooms/use-guess-entry';
import { cellKey, type GridView } from '../rooms/word-visibility';

/** Side of one grid square, in pixels. */
const CELL_SIZE = 32;

const REFUSAL_MESSAGE =
  'That is not the word — the letters clear in a moment. Try again as often as you like.';

interface CrosswordGridProps {
  /** The board as this player may see it, already stripped of every unearned letter. */
  readonly view: GridView;
  /** Records a word this player has just answered. */
  readonly onSolved: (wordId: string) => Promise<void>;
}

/**
 * The crossword: the squares that exist, the letters that have been earned, and
 * the ones this player is filling in.
 *
 * The room document carries every word in plain text, so the grid is exactly
 * where the game can be given away. This component is handed no word and no
 * unearned letter: `gridViewFor` decides what may be drawn and hands over the
 * squares of this player's own words as bare coordinates
 * (`docs/decisions/0011-typing-guesses-into-the-grid.md`). A square is
 * therefore blank, or it holds a letter the group has already solved, or it is
 * a box this player types into — and there is nothing here that could render a
 * fourth thing by mistake.
 *
 * @param props.view - What this player's screen may draw, from `gridViewFor`
 * @param props.onSolved - Called once a word of theirs has been answered
 *
 * @example
 * <CrosswordGrid view={gridViewFor(room, viewerId)} onSolved={submitGuess} />
 */
export const CrosswordGrid = ({ view, onSolved }: CrosswordGridProps) => {
  const entry = useGuessEntry(view, onSolved);
  const inputs = useRef(new Map<string, HTMLInputElement>());

  const rows = Array.from({ length: view.rows }, (_unused, row) => row);
  const cols = Array.from({ length: view.cols }, (_unused, col) => col);
  const filledIn = [...entry.cells.values()].filter((cell) => cell.letter !== '').length;

  const handleTyped = (cell: GuessEntryCell) => (event: ChangeEvent<HTMLInputElement>) => {
    entry.type(cell, event.target.value);

    // Typing runs along the word rather than along the row, so a down word can
    // be entered without reaching for the mouse between letters.
    if (event.target.value !== '' && cell.nextCellKey !== null) {
      inputs.current.get(cell.nextCellKey)?.focus();
    }
  };

  const renderCell = (row: number, col: number) => {
    const key = cellKey({ row, col });
    const cell = entry.cells.get(key);

    if (cell === undefined) {
      return <Box key={key} sx={{ height: CELL_SIZE, width: CELL_SIZE }} />;
    }

    const square = {
      height: CELL_SIZE,
      width: CELL_SIZE,
      borderRadius: '2px',
      border: '1px solid',
      borderColor: cell.isRefused ? 'error.main' : 'divider',
      display: 'grid',
      placeItems: 'center',
      fontSize: '0.95rem',
      fontWeight: 600,
      textTransform: 'uppercase',
    } as const;

    if (!cell.isEditable) {
      return (
        <Box key={key} sx={{ ...square, backgroundColor: 'background.paper' }}>
          {cell.letter}
        </Box>
      );
    }

    return (
      <Box
        key={key}
        component="input"
        inputMode="text"
        autoComplete="off"
        maxLength={1}
        value={cell.letter}
        onChange={handleTyped(cell)}
        onFocus={(event: { target: HTMLInputElement }) => event.target.select()}
        ref={(input: HTMLInputElement | null) => {
          if (input === null) {
            inputs.current.delete(key);
          } else {
            inputs.current.set(key, input);
          }
        }}
        aria-label={`Row ${row + 1}, column ${col + 1} — a letter of one of your words`}
        sx={{
          ...square,
          // A square this player fills in is marked out from the ones that are
          // somebody else's to answer: the grid is shared, the typing is not.
          borderColor: cell.isRefused ? 'error.main' : 'primary.main',
          padding: 0,
          textAlign: 'center',
          font: 'inherit',
          fontWeight: 600,
          color: 'text.primary',
          backgroundColor: cell.isRefused ? 'error.light' : 'action.selected',
          '&:focus': { outline: '2px solid', outlineColor: 'primary.main' },
        }}
      />
    );
  };

  return (
    <Box sx={{ overflowX: 'auto', py: 1 }}>
      <Box
        role="group"
        aria-label={`Crossword grid, ${view.rows} by ${view.cols}, ${entry.cells.size} squares, ${filledIn} of them filled in`}
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${view.cols}, ${CELL_SIZE}px)`,
          gap: '2px',
          width: 'max-content',
        }}
      >
        {rows.map((row) => cols.map((col) => renderCell(row, col)))}
      </Box>

      <Typography variant="body2" color="error" role="status" sx={{ mt: 1, minHeight: '1.5em' }}>
        {entry.hasRefusal ? REFUSAL_MESSAGE : ''}
      </Typography>
    </Box>
  );
};
