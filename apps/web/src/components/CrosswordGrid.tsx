import Box from '@mui/material/Box';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useMemo, useRef, type ChangeEvent, type KeyboardEvent, type MouseEvent } from 'react';

import { useGuessEntry, type GuessEntryCell } from '../rooms/use-guess-entry';
import { cellKey, type GridView } from '../rooms/word-visibility';

/** Side of one grid square, in pixels. */
const CELL_SIZE = 32;

/** Text that is read out but not drawn — for what the grid says in colour alone. */
const SPOKEN_ONLY: SxProps<Theme> = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
};

/**
 * The crossword number of a square, in its top-left corner, as a crossword
 * prints it: small enough to leave the middle of the square to the letter, and
 * in the same dark ink whatever the square is doing underneath — a number has
 * to stay readable on a square being typed into and on one showing a wrong
 * answer in red. It takes no clicks: the square below it is the thing to press.
 */
const NUMBER_SX: SxProps<Theme> = {
  position: 'absolute',
  top: '1px',
  left: '2px',
  fontSize: '0.55rem',
  fontWeight: 700,
  lineHeight: 1,
  color: 'text.primary',
  pointerEvents: 'none',
};

/**
 * How a square holding a word this player explains is drawn.
 *
 * Three cues, none of which is a colour on its own: a dashed outline where every
 * other square has a solid one, the letter in italics where every other letter
 * is upright, and a word said out loud for a reader who sees neither. A player
 * who cannot tell this from a square the group has answered stops explaining a
 * word nobody has guessed, and the game stalls with everyone waiting — so the
 * distinction has to survive a screen read in greyscale
 * (`docs/decisions/0015-explained-words-in-the-grid.md`).
 *
 * The tint stays faint so the crossword number keeps its dark ink on top of it.
 */
const EXPLAINED_SQUARE_SX: SxProps<Theme> = {
  backgroundColor: (theme) => alpha(theme.palette.secondary.main, 0.16),
  borderStyle: 'dashed',
  borderColor: 'secondary.main',
  fontStyle: 'italic',
};

/** Said before the letter of a square this player explains, and drawn nowhere. */
const EXPLAINED_SPOKEN = 'Yours to explain: ';

const REFUSAL_MESSAGE =
  'That is not the word — the letters clear in a moment. Try again as often as you like.';

/** Said only to a player who actually has two words of their own crossing. */
const CROSSING_HINT =
  'Two of your words cross. On the shared square, click it again or press the space bar to swap between them.';

interface CrosswordGridProps {
  /** The board as this player may see it, already stripped of every unearned letter. */
  readonly view: GridView;
  /** Records a word this player has just answered. */
  readonly onSolved: (wordId: string) => Promise<void>;
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
 * One thing a square may carry whatever else it is doing: the crossword number
 * of the word that begins in it, which is how the players name a word to each
 * other out loud. It gives nothing away — where the words begin and how long
 * they are is already drawn in the outlines of the squares.
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

  const rows = Array.from({ length: view.rows }, (_unused, row) => row);
  const cols = Array.from({ length: view.cols }, (_unused, col) => col);
  const filledIn = [...entry.cells.values()].filter((cell) => cell.letter !== '').length;

  const handleTyped = (cell: GuessEntryCell) => (event: ChangeEvent<HTMLInputElement>) => {
    entry.type(cell, event.target.value);

    // Typing runs along the word being filled rather than along the row, so a
    // down word can be entered without reaching for the mouse between letters.
    if (event.target.value !== '' && cell.nextCellKey !== null) {
      inputs.current.get(cell.nextCellKey)?.focus();
    }
  };

  // Clicking a square already under the cursor is what swaps between the two
  // words crossing there — the classic crossword gesture. Read at mousedown,
  // before the click has moved the focus, so the first click on a new square
  // only picks it up.
  const handlePressed = (cell: GuessEntryCell) => (event: MouseEvent<HTMLInputElement>) => {
    if (event.currentTarget === document.activeElement) {
      entry.switchWordAt(cell);
    }
  };

  // The same swap from the keyboard, since a space is not a letter and the
  // squares would otherwise be reachable only with a mouse.
  const handleKeyDown = (cell: GuessEntryCell) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === ' ') {
      event.preventDefault();
      entry.switchWordAt(cell);
    }
  };

  const renderCell = (row: number, col: number) => {
    const key = cellKey({ row, col });
    const cell = entry.cells.get(key);

    if (cell === undefined) {
      return <Box key={key} sx={{ height: CELL_SIZE, width: CELL_SIZE }} />;
    }

    const number = numbers.get(key) ?? null;

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

    // The number goes over the square rather than in it: a square this player
    // types into is an `input`, which cannot hold anything.
    const numberDrawn =
      number === null ? null : (
        <Box component="span" aria-hidden="true" sx={NUMBER_SX}>
          {number}
        </Box>
      );

    if (cell.source !== 'own') {
      const isExplained = cell.source === 'explained';

      return (
        <Box key={key} sx={{ position: 'relative', height: CELL_SIZE, width: CELL_SIZE }}>
          {/*
            A square nobody types into has no label of its own — it is a letter
            or it is blank — so its number is said here, before the letter, or a
            reader who cannot see the grid has no way to hear it. What the square
            is follows, and only where it is not the ordinary case: a letter said
            plainly is one the group has answered.
          */}
          {number !== null && <Box component="span" sx={SPOKEN_ONLY}>{`Number ${number}.`}</Box>}
          {isExplained && (
            <Box component="span" sx={SPOKEN_ONLY}>
              {EXPLAINED_SPOKEN}
            </Box>
          )}
          <Box
            sx={
              isExplained
                ? { ...square, ...EXPLAINED_SQUARE_SX }
                : { ...square, backgroundColor: 'background.paper' }
            }
          >
            {cell.letter}
          </Box>
          {numberDrawn}
        </Box>
      );
    }

    return (
      <Box key={key} sx={{ position: 'relative', height: CELL_SIZE, width: CELL_SIZE }}>
        <Box
          component="input"
          inputMode="text"
          autoComplete="off"
          maxLength={1}
          value={cell.letter}
          onChange={handleTyped(cell)}
          onMouseDown={handlePressed(cell)}
          onKeyDown={handleKeyDown(cell)}
          onFocus={(event: { target: HTMLInputElement }) => {
            entry.focus(cell);
            event.target.select();
          }}
          ref={(input: HTMLInputElement | null) => {
            if (input === null) {
              inputs.current.delete(key);
            } else {
              inputs.current.set(key, input);
            }
          }}
          // The number comes first, because it is what the players call the word
          // by out loud — and it is left out of the squares that carry none
          // rather than said to be absent.
          aria-label={`${number === null ? '' : `Number ${number}, `}Row ${row + 1}, column ${col + 1} — a letter of one of your words, filled ${cell.direction}${cell.isCrossing ? ', where two of them cross' : ''}`}
          sx={{
            ...square,
            // A square this player fills in is marked out from the ones that are
            // somebody else's to answer: the grid is shared, the typing is not.
            // The word being filled is marked out again within that, so which way
            // the next letter will go is on screen rather than guessed at.
            borderColor: cell.isRefused ? 'error.main' : 'primary.main',
            padding: 0,
            textAlign: 'center',
            font: 'inherit',
            fontWeight: 600,
            color: 'text.primary',
            backgroundColor: (theme) =>
              cell.isRefused
                ? theme.palette.error.light
                : cell.isActive
                  ? alpha(theme.palette.primary.main, 0.22)
                  : theme.palette.action.selected,
            '&:focus': { outline: '2px solid', outlineColor: 'primary.main' },
          }}
        />
        {numberDrawn}
      </Box>
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

      {entry.hasCrossings && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {CROSSING_HINT}
        </Typography>
      )}

      <Typography variant="body2" color="error" role="status" sx={{ mt: 1, minHeight: '1.5em' }}>
        {entry.hasRefusal ? REFUSAL_MESSAGE : ''}
      </Typography>
    </Box>
  );
};
