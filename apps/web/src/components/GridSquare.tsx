import Box from '@mui/material/Box';
import { type SxProps, type Theme } from '@mui/material/styles';
import {
  type ChangeEvent,
  type CompositionEvent,
  type CSSProperties,
  type FocusEvent,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { type GuessEntryCell, letterTyped } from '../rooms/guess-board';
import { STREET } from '../street';
import { type GridSurfaces, TEXT_FONT_FAMILY } from '../theme';
import { CELL_SIDE } from './board-geometry';
import {
  ANSWERED_SQUARE_SX,
  NUMBER_SX,
  SQUARE_BASE_SX,
  SQUARE_SHADOW,
  TICK_SX,
} from './square-styles';

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
 * It is drawn in ink rather than in an accent of its own, and that is the same
 * decision: the board carries one accent, which belongs to the squares this
 * player types in, so a square they merely read is a tone of the paper it is on
 * (see `theme.ts`). The outline is `ink` and not `line`, so ADR 0015's cue
 * survives the move to the street's colours. The tone stays light enough for
 * the crossword number to keep its dark ink on top of it.
 */
const EXPLAINED_SQUARE_SX: SxProps<Theme> = {
  boxShadow: SQUARE_SHADOW,
  outline: `1.5px dashed ${STREET.ink}`,
  outlineOffset: '-1.5px',
  fontStyle: 'italic',
};

/** The stroke through a refused answer, `.cell.refused::after`: brick, a little off level. */
const STRIKE_SX = {
  content: '""',
  position: 'absolute',
  left: '18%',
  right: '18%',
  top: '50%',
  height: '2px',
  backgroundColor: STREET.brick,
  transform: 'rotate(-14deg)',
  pointerEvents: 'none',
} as const;

/**
 * How the square the next letter will land in is marked (`.cell.cursor`): a 3px
 * ring of spruce drawn inside the square with the shadow in ink, and a bar of
 * spruce under the letter ({@link CURSOR_BAR_SX}). Drawn from the cursor rather
 * than from `:focus`, so it stays on the board when the player's focus is
 * somewhere else entirely — a phone keyboard, another window
 * (`docs/decisions/0016-the-cursor-lives-in-the-grid.md`).
 */
const CURSOR_SX: SxProps<Theme> = {
  boxShadow: `inset 0 0 0 3px ${STREET.spruce}, 2px 2px 0 0 ${STREET.ink}`,
};

/** The bar under the letter of the cursor square, `.cell.cursor::before`. */
const CURSOR_BAR_SX = {
  content: '""',
  position: 'absolute',
  left: '30%',
  right: '30%',
  bottom: '15%',
  height: '2.5px',
  borderRadius: '2px',
  backgroundColor: STREET.spruce,
  pointerEvents: 'none',
} as const;

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

/**
 * Which of the board's surfaces a square is drawn on.
 *
 * A refused answer wins over everything else, being the one thing on the board
 * that has to be noticed rather than found — and it can only ever be a square
 * of this player's own, since nobody else's is theirs to get wrong.
 *
 * The surfaces themselves are in `theme.ts` rather than here, which is what
 * lets them be held to telling each other apart with the colour taken out: the
 * distinction between a word this player explains and one the group answered is
 * what the game stalls on if it is lost
 * (`docs/decisions/0015-explained-words-in-the-grid.md`).
 *
 * @param cell - The square, as the entry layer worked it out
 * @returns The name of the surface it is drawn on
 */
const squareSurface = (cell: GuessEntryCell): keyof GridSurfaces => {
  if (cell.isRefused) {
    return 'refused';
  }

  switch (cell.source) {
    case 'own':
      return cell.isActive ? 'ownFilling' : 'own';
    case 'explained':
      return 'explained';
    case 'solved':
      return 'guessed';
    case 'blank':
      return 'empty';
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
  /**
   * Where this square stands in the word that was answered while the board was
   * on the screen, when it turned over because of it; absent otherwise.
   */
  readonly turnPlace?: number;
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
  turnPlace,
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

  // What a composing keyboard has put in the square that is not yet a letter: a
  // dead key's bare accent, on its way to becoming the é it is typed for. Held
  // here and not handed up, because handing it up clears the square and the
  // square then rewrites the input, which ends the composition on the spot.
  const [held, setHeld] = useState<string | null>(null);
  const isComposing = useRef(false);

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    if (isComposing.current && letterTyped(value) === '') {
      setHeld(value);

      return;
    }

    setHeld(null);
    onTyped(value);
  };

  const handleCompositionEnd = (event: CompositionEvent<HTMLInputElement>) => {
    isComposing.current = false;

    // The composition ended on something that never became a letter (the dead
    // key was pressed twice, or abandoned): the square takes it as it takes any
    // other input, which clears it. When it did become a letter it was handed up
    // as it arrived, and there is nothing left to say.
    if (held !== null) {
      setHeld(null);
      onTyped(event.currentTarget.value);
    }
  };

  const label = labelFor(cell, number);
  const tabIndex = isCursor || isTabStop ? 0 : -1;

  // The kinds of square, one outline or mark each, so none of them is told
  // apart by its fill alone (sage and paper are 1.28 apart in lightness). A
  // refused answer keeps the outline of the square it replaced.
  const kindSx: SxProps<Theme> = cell.isRefused
    ? { fontWeight: 700 }
    : cell.source === 'solved'
      ? ANSWERED_SQUARE_SX
      : cell.source === 'explained'
        ? EXPLAINED_SQUARE_SX
        : {};

  const square = {
    ...SQUARE_BASE_SX,
    backgroundColor: (theme: Theme) => theme.palette.grid[squareSurface(cell)],
    ...(kindSx as object),
    ...(isCursor ? (CURSOR_SX as object) : {}),
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

  // The drawing's `cell just` and `cell refused` (`state-tree.html`, lines
  // 332 and 336): the classes `motion-styles.ts` moves. `--d` is the square's
  // place in its word, which is what makes the word turn over one square after
  // another.
  const isTurning = cell.source === 'solved' && turnPlace !== undefined;
  const motionClass = cell.isRefused ? 'cell refused' : isTurning ? 'cell just' : undefined;
  const motionStyle = isTurning ? ({ '--d': turnPlace } as CSSProperties) : undefined;

  return (
    <Box
      className={motionClass}
      style={motionStyle}
      sx={{
        position: 'relative',
        height: CELL_SIDE,
        width: CELL_SIDE,
        // The marks that sit over a square are on the box round it: an `input`
        // can have no pseudo-element of its own.
        zIndex: isCursor ? 1 : undefined,
        ...(cell.isRefused
          ? { '&::after': STRIKE_SX }
          : cell.source === 'solved'
            ? { '&::after': TICK_SX }
            : {}),
        ...(isCursor ? { '&::before': CURSOR_BAR_SX } : {}),
      }}
    >
      {cell.source === 'own' ? (
        <Box
          component="input"
          inputMode="text"
          autoComplete="off"
          // No `maxLength`: a limit of one cuts an é that arrives as an `e` and a
          // separate accent down to the `e` before `onChange` ever runs. The
          // square keeps one letter by taking the last one of what it holds
          // (`letterTyped`), composed.
          value={held ?? cell.letter}
          aria-label={label}
          tabIndex={tabIndex}
          onChange={handleInput}
          onCompositionStart={() => {
            isComposing.current = true;
          }}
          onCompositionEnd={handleCompositionEnd}
          onMouseDown={onPressed}
          onFocus={(event: FocusEvent<HTMLInputElement>) => {
            onTakenUp();
            event.target.select();
          }}
          ref={takeSquareUp}
          sx={{
            ...square,
            // A square this player fills in is a tile with the word being
            // filled in a wash, so which way the next letter will go is on
            // screen rather than guessed at.
            textAlign: 'center',
            // Said again rather than left to the spread above: an input takes
            // none of the page's typography on its own, and restating it here
            // is what keeps this square's family tied to `square`'s rather
            // than to whichever family happens to surround the board.
            fontFamily: TEXT_FONT_FAMILY,
            fontWeight: cell.isRefused ? 700 : 400,
            color: STREET.ink,
          }}
        />
      ) : (
        <Box
          aria-label={label}
          tabIndex={tabIndex}
          onMouseDown={onPressed}
          onFocus={onTakenUp}
          ref={takeSquareUp}
          sx={cell.source === 'explained' ? { ...square, ...EXPLAINED_SQUARE_SX } : square}
        >
          {cell.letter}
        </Box>
      )}
      {numberDrawn}
    </Box>
  );
};
