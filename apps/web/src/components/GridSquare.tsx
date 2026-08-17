import Box from '@mui/material/Box';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import { type ChangeEvent, type FocusEvent, useLayoutEffect, useRef } from 'react';

import type { GuessEntryCell } from '../rooms/guess-board';

/** Side of one grid square, in pixels. */
export const CELL_SIZE = 32;

/**
 * The crossword number of a square, in its top-left corner, as a crossword
 * prints it: small enough to leave the middle of the square to the letter, and
 * in the same dark ink whatever the square is doing underneath — a number has to
 * stay readable on a square being typed into and on one showing a wrong answer
 * in red. It takes no clicks: the square below it is the thing to press, and it
 * is said in the square's own label rather than read off the screen.
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

/**
 * How the square the next letter will land in is marked.
 *
 * A ring drawn inside the square, and deliberately not another tint: the word
 * being filled is already marked by its background, and a cursor that differed
 * from it only in shade would be the thing this ticket set out to fix. Drawn
 * from the cursor rather than from `:focus`, so it stays on the board when the
 * player's focus is somewhere else entirely — a phone keyboard, another window
 * (`docs/decisions/0016-the-cursor-lives-in-the-grid.md`).
 */
const CURSOR_SX: SxProps<Theme> = {
  outlineStyle: 'solid',
  outlineWidth: '3px',
  outlineOffset: '-3px',
  outlineColor: (theme) => theme.palette.primary.dark,
};

/**
 * What a square says to a reader who cannot see it: where it is, what it holds,
 * and whether it is theirs to type in.
 *
 * The number comes first, because it is what the players call the word by out
 * loud — and it is left out of the squares that carry none rather than said to
 * be absent. A letter said plainly is one the group has answered; anything else
 * about the square is named.
 */
const labelFor = (cell: GuessEntryCell, number: number | null): string => {
  const where = `${number === null ? '' : `Number ${number}, `}Row ${cell.row + 1}, column ${cell.col + 1}`;

  switch (cell.source) {
    case 'own':
      return `${where} — a letter of one of your words, filled ${cell.direction}${cell.isCrossing ? ', where two of them cross' : ''}`;
    case 'explained':
      return `${where} — ${cell.letter}, yours to explain`;
    case 'solved':
      return `${where} — ${cell.letter}`;
    case 'blank':
      return `${where} — empty`;
  }
};

interface GridSquareProps {
  /** The square as the entry layer worked it out. */
  readonly cell: GuessEntryCell;
  /** The crossword number printed in it, `null` unless a word begins here. */
  readonly number: number | null;
  /** `true` for the one square the next letter will land in. */
  readonly isCursor: boolean;
  /** `true` for the square the Tab key reaches, so the board is one stop and not eighty. */
  readonly isTabStop: boolean;
  /** Called with what was typed into it — only ever from a square of this player's own. */
  readonly onTyped: (letter: string) => void;
  /** Called when the square takes the player's attention, however it took it. */
  readonly onTakenUp: () => void;
  /** Called as the square is pressed, before the focus has moved onto it. */
  readonly onPressed: () => void;
}

/**
 * One square of the crossword: a box, a letter, or a place to type.
 *
 * A square this player types into is an `input` and nothing else will do — a
 * phone opens its keyboard for an input and for no `div`, and the game is meant
 * to be played on a phone. Every other square is a box that can still be moved
 * onto: the arrows cross the whole board, so a square of somebody else's word is
 * reachable, readable and not typeable
 * (`docs/decisions/0016-the-cursor-lives-in-the-grid.md`).
 *
 * The browser's focus follows the cursor rather than deciding it. The square
 * puts the focus on itself when it becomes the cursor, which is what makes
 * moving the cursor audible: a reader who cannot see the grid hears the square
 * they arrived at.
 *
 * @param props.cell - The square to draw
 * @param props.number - Its crossword number, if a word begins here
 * @param props.isCursor - Whether the next letter lands here
 *
 * @example
 * <GridSquare cell={cell} number={3} isCursor isTabStop onTyped={type} … />
 */
export const GridSquare = ({
  cell,
  number,
  isCursor,
  isTabStop,
  onTyped,
  onTakenUp,
  onPressed,
}: GridSquareProps) => {
  const element = useRef<HTMLElement | null>(null);
  // What this square last was. A square is an `input` or it is not, so a change
  // here means the element itself was replaced rather than redrawn.
  const wasSource = useRef(cell.source);

  useLayoutEffect(() => {
    // Before the browser paints rather than after, so that a square reached by
    // tapping its entry in the panel is focused while the tap that asked for it
    // is still being handled — which is what lets a phone open its keyboard.
    if (isCursor) {
      element.current?.focus();
    }
  }, [isCursor]);

  useLayoutEffect(() => {
    const wasReplaced = wasSource.current !== cell.source;

    wasSource.current = cell.source;

    // The square under the cursor can be replaced beneath it: answering a word
    // turns its inputs into letters, and the focus then falls to the document
    // with nothing to catch it — the arrows would go dead until the player
    // reached for the mouse. Taken back only where it was genuinely lost, so a
    // player who has moved on to something else on the page keeps it.
    if (wasReplaced && isCursor && document.activeElement === document.body) {
      element.current?.focus();
    }
  });

  const label = labelFor(cell, number);
  const tabIndex = isCursor || isTabStop ? 0 : -1;

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
    ...(isCursor ? CURSOR_SX : {}),
  } as const;

  // The number goes over the square rather than in it: a square this player
  // types into is an `input`, which cannot hold anything.
  const numberDrawn =
    number === null ? null : (
      <Box component="span" aria-hidden="true" sx={NUMBER_SX}>
        {number}
      </Box>
    );

  const takeSquareUp = (node: HTMLElement | null) => {
    element.current = node;
  };

  return (
    <Box sx={{ position: 'relative', height: CELL_SIZE, width: CELL_SIZE }}>
      {cell.source === 'own' ? (
        <Box
          component="input"
          inputMode="text"
          autoComplete="off"
          maxLength={1}
          value={cell.letter}
          aria-label={label}
          tabIndex={tabIndex}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onTyped(event.target.value)}
          onMouseDown={onPressed}
          onFocus={(event: FocusEvent<HTMLInputElement>) => {
            onTakenUp();
            event.target.select();
          }}
          ref={takeSquareUp}
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
          }}
        />
      ) : (
        <Box
          aria-label={label}
          tabIndex={tabIndex}
          onMouseDown={onPressed}
          onFocus={onTakenUp}
          ref={takeSquareUp}
          sx={
            cell.source === 'explained'
              ? { ...square, ...EXPLAINED_SQUARE_SX }
              : { ...square, backgroundColor: 'background.paper' }
          }
        >
          {cell.letter}
        </Box>
      )}
      {numberDrawn}
    </Box>
  );
};
