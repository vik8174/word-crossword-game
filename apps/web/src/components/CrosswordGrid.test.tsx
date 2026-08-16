import { act, fireEvent, render, screen } from '@testing-library/react';
import { checkGuess, type GridPosition } from 'shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GridCellView, GridView, GuessableWord } from '../rooms/word-visibility';
import { CrosswordGrid } from './CrosswordGrid';

/** `CAT` across the top row, `CAR` down the left column, sharing the `C`. */
const CAT: readonly GridPosition[] = [
  { row: 0, col: 0 },
  { row: 0, col: 1 },
  { row: 0, col: 2 },
];
const CAR: readonly GridPosition[] = [
  { row: 0, col: 0 },
  { row: 1, col: 0 },
  { row: 2, col: 0 },
];

const LETTERS: Readonly<Record<string, string>> = {
  '0:0': 'C',
  '0:1': 'A',
  '0:2': 'T',
  '1:0': 'A',
  '2:0': 'R',
};

const guessable = (id: string, cells: readonly GridPosition[], word: string, isSolved = false) =>
  ({
    id,
    orientation: cells[0]?.row === cells[1]?.row ? 'across' : 'down',
    cells,
    isSolved,
    accepts: (guess: string) => checkGuess(guess, word),
  }) satisfies GuessableWord;

/**
 * A board whose squares show a letter only when named in `revealed` — exactly
 * what `gridViewFor` hands over once the words covering them have been solved.
 *
 * Numbers are handed over the same way: a square carries one when `numbered`
 * names it, and the grid draws what it is given rather than working out where
 * the words begin (that is `numberCrossword`, tested where it lives).
 */
const viewWith = (
  revealed: readonly string[],
  toGuess: readonly GuessableWord[],
  numbered: Readonly<Record<string, number>> = {},
): GridView => ({
  rows: 3,
  cols: 3,
  cells: Object.keys(LETTERS).map((key): GridCellView => {
    const [row, col] = key.split(':').map(Number);

    return {
      row: row!,
      col: col!,
      letter: revealed.includes(key) ? LETTERS[key]! : null,
      number: numbered[key] ?? null,
    };
  }),
  toGuess,
});

/**
 * A plus-shaped board: `EAT` across the middle row, `OAK` down the middle
 * column, sharing the `A` in the middle of both. Two words hidden from the same
 * player crossing each other is what this shape is for.
 */
const EAT: readonly GridPosition[] = [
  { row: 1, col: 0 },
  { row: 1, col: 1 },
  { row: 1, col: 2 },
];
const OAK: readonly GridPosition[] = [
  { row: 0, col: 1 },
  { row: 1, col: 1 },
  { row: 2, col: 1 },
];

/** Both of these words are this player's own, in the order the layout holds them. */
const crossingView = (): GridView => ({
  rows: 3,
  cols: 3,
  cells: [...EAT, { row: 0, col: 1 }, { row: 2, col: 1 }]
    .filter(
      (cell, index, all) =>
        all.findIndex((other) => other.row === cell.row && other.col === cell.col) === index,
    )
    .map((cell): GridCellView => ({ ...cell, letter: null, number: null })),
  toGuess: [guessable('w0', EAT, 'eat'), guessable('w1', OAK, 'oak')],
});

const cellInput = (row: number, col: number) =>
  screen.getByLabelText(new RegExp(`Row ${row + 1}, column ${col + 1}\\b`, 'i'));

const typeInto = (row: number, col: number, letter: string) =>
  fireEvent.change(cellInput(row, col), { target: { value: letter } });

const onSolved = vi.fn<(wordId: string) => Promise<void>>();

const renderGrid = (view: GridView) => render(<CrosswordGrid view={view} onSolved={onSolved} />);

/** Everything the board itself says, numbers and letters alike. */
const board = () => screen.getByRole('group', { name: /crossword grid/i });

beforeEach(() => {
  vi.clearAllMocks();
  onSolved.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CrosswordGrid', () => {
  it('draws the whole board, empty squares included', () => {
    renderGrid(viewWith([], []));

    expect(board().childElementCount).toBe(3 * 3);
  });

  it('gives away no letter while nothing has been solved', () => {
    renderGrid(viewWith([], [guessable('w1', CAR, 'car')]));

    expect(board().textContent).toBe('');
    expect(cellInput(0, 0)).toHaveValue('');
  });

  it('shows a solved word as letters nobody can type over', () => {
    renderGrid(viewWith(['0:0', '0:1', '0:2'], [guessable('w1', CAR, 'car')]));

    expect(board().textContent).toContain('CAT');
    expect(screen.queryByLabelText(/Row 1, column 2\b/i)).not.toBeInTheDocument();
  });

  it('lets a player type only into the squares of their own words', () => {
    renderGrid(viewWith([], [guessable('w1', CAR, 'car')]));

    expect(screen.getAllByLabelText(/a letter of one of your words/i)).toHaveLength(CAR.length);
    expect(screen.queryByLabelText(/Row 1, column 3\b/i)).not.toBeInTheDocument();
  });

  it('offers nothing to type to a player with no word of their own', () => {
    renderGrid(viewWith([], []));

    expect(screen.queryByLabelText(/a letter of one of your words/i)).not.toBeInTheDocument();
  });

  describe('numbering', () => {
    // `CAT` and `CAR` begin in the top-left square and share its number; `TIN`
    // would begin where `CAT` ends. Only the two of them are drawn here.
    const NUMBERED = { '0:0': 1, '0:2': 2 } as const;

    it('draws a number in the square a word begins in, and in no other', () => {
      renderGrid(viewWith([], [guessable('w1', CAR, 'car')], NUMBERED));

      expect(board().textContent).toContain('1');
      expect(board().textContent).toContain('2');
      // The middle square of the top row starts nothing, so it says nothing.
      expect(board().textContent).not.toContain('3');
    });

    it('adds no letter to the board along with the numbers', () => {
      renderGrid(viewWith([], [guessable('w1', CAR, 'car')], NUMBERED));

      // Everything the board says, in full: the number this player types under,
      // the number of a square that is somebody else's — said out loud there,
      // since a square nobody types into has no label of its own — and nothing
      // else at all.
      expect(board().textContent).toBe('1Number 2.2');
    });

    it('says the number to a player typing into that square', () => {
      renderGrid(viewWith([], [guessable('w1', CAR, 'car')], NUMBERED));

      // The number leads: it is what the players call the word by out loud.
      expect(cellInput(0, 0)).toHaveAccessibleName(
        /^Number 1, row 1, column 1 — a letter of one of your words/i,
      );
      expect(cellInput(1, 0)).toHaveAccessibleName(/^Row 2, column 1\b/i);
    });

    it("says the number over a square that is nobody's to type in", () => {
      renderGrid(viewWith(['0:0', '0:1', '0:2'], [guessable('w1', CAR, 'car')], NUMBERED));

      // A solved square is a plain letter with no label of its own, so the
      // number has to be spoken beside it or a reader loses it.
      expect(screen.getByText('Number 1.')).toBeInTheDocument();
      expect(board().textContent).toMatch(/C.*A.*T/);
    });
  });

  it('records the word the moment its last square is filled, with no button to press', async () => {
    renderGrid(viewWith([], [guessable('w1', CAR, 'car')]));

    typeInto(0, 0, 'c');
    typeInto(1, 0, 'a');
    expect(onSolved).not.toHaveBeenCalled();

    await act(async () => typeInto(2, 0, 'r'));

    expect(onSolved).toHaveBeenCalledExactlyOnceWith('w1');
  });

  it('takes the answer however the player capitalised it', async () => {
    renderGrid(viewWith([], [guessable('w1', CAR, 'Car')]));

    await act(async () => {
      typeInto(0, 0, 'C');
      typeInto(1, 0, 'A');
      typeInto(2, 0, 'R');
    });

    expect(onSolved).toHaveBeenCalledExactlyOnceWith('w1');
  });

  it('shows a wrong answer as refused, writing nothing down', async () => {
    renderGrid(viewWith([], [guessable('w1', CAR, 'car')]));

    await act(async () => {
      typeInto(0, 0, 'b');
      typeInto(1, 0, 'a');
      typeInto(2, 0, 'r');
    });

    expect(onSolved).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(/not the word/i);
    // Still readable, so the player can see what they got wrong.
    expect(cellInput(0, 0)).toHaveValue('B');
  });

  it('takes a refused answer back off the board on its own', async () => {
    vi.useFakeTimers();
    renderGrid(viewWith([], [guessable('w1', CAR, 'car')]));

    act(() => {
      typeInto(0, 0, 'b');
      typeInto(1, 0, 'a');
      typeInto(2, 0, 'r');
    });
    act(() => vi.advanceTimersByTime(2000));

    expect(cellInput(0, 0)).toHaveValue('');
    expect(cellInput(1, 0)).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent('');
    vi.useRealTimers();
  });

  it('does not count the attempt: the same squares take the next answer', async () => {
    renderGrid(viewWith([], [guessable('w1', CAR, 'car')]));

    await act(async () => {
      typeInto(0, 0, 'b');
      typeInto(1, 0, 'a');
      typeInto(2, 0, 'r');
    });

    // Typing again clears the refused word rather than making the player
    // delete it letter by letter.
    await act(async () => typeInto(0, 0, 'c'));
    expect(cellInput(1, 0)).toHaveValue('');

    await act(async () => {
      typeInto(1, 0, 'a');
      typeInto(2, 0, 'r');
    });

    expect(onSolved).toHaveBeenCalledExactlyOnceWith('w1');
  });

  it('keeps the letters a crossing word already filled in when an answer is refused', async () => {
    // The `C` came from `CAT`, which somebody else solved — it is not this
    // player's to lose over a wrong guess.
    vi.useFakeTimers();
    renderGrid(viewWith(['0:0', '0:1', '0:2'], [guessable('w1', CAR, 'car')]));

    act(() => {
      typeInto(1, 0, 'x');
      typeInto(2, 0, 'y');
    });

    expect(screen.getByRole('status')).toHaveTextContent(/not the word/i);
    act(() => vi.advanceTimersByTime(2000));

    expect(board().textContent).toContain('CAT');
    expect(cellInput(1, 0)).toHaveValue('');
    vi.useRealTimers();
  });

  it('refuses a word a crossing answer filled in wrongly, though nobody typed the last letter', async () => {
    // The player had already typed `X` where `CAR` reads `A`; somebody else
    // solving a word across its last square is what fills the word up.
    const view = viewWith([], [guessable('w1', CAR, 'car')]);
    const { rerender } = renderGrid(view);

    await act(async () => {
      typeInto(0, 0, 'c');
      typeInto(1, 0, 'x');
    });
    expect(screen.getByRole('status')).toHaveTextContent('');

    await act(async () => {
      rerender(
        <CrosswordGrid
          view={viewWith(['2:0'], [guessable('w1', CAR, 'car')])}
          onSolved={onSolved}
        />,
      );
    });

    expect(onSolved).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(/not the word/i);
  });

  it('lets a player type into every word of their own', () => {
    renderGrid(viewWith([], [guessable('w0', CAT, 'cat'), guessable('w1', CAR, 'car')]));

    expect(screen.getAllByLabelText(/a letter of one of your words/i)).toHaveLength(5);
  });

  it('takes a wrong answer back without emptying the word it crosses', async () => {
    // Both words are this player's own and share the top-left square. Getting
    // `CAR` wrong must not wipe the `C` they typed as part of `CAT`.
    vi.useFakeTimers();
    renderGrid(viewWith([], [guessable('w0', CAT, 'cat'), guessable('w1', CAR, 'car')]));

    act(() => {
      typeInto(0, 0, 'c');
      typeInto(1, 0, 'x');
      typeInto(2, 0, 'y');
    });

    expect(screen.getByRole('status')).toHaveTextContent(/not the word/i);
    act(() => vi.advanceTimersByTime(2000));

    expect(cellInput(0, 0)).toHaveValue('C');
    expect(cellInput(1, 0)).toHaveValue('');
    expect(cellInput(2, 0)).toHaveValue('');

    // And the word that kept its letter can still be answered.
    act(() => {
      typeInto(0, 1, 'a');
      typeInto(0, 2, 't');
    });
    vi.useRealTimers();

    expect(onSolved).toHaveBeenCalledExactlyOnceWith('w0');
  });

  it('moves along the word as letters are typed, not along the row', () => {
    renderGrid(viewWith([], [guessable('w1', CAR, 'car')]));

    cellInput(0, 0).focus();
    typeInto(0, 0, 'c');

    expect(document.activeElement).toBe(cellInput(1, 0));
  });

  it('skips over a square a crossing word already filled in', async () => {
    // `CAR` reads down from the shared `C`, so the first square this player can
    // type in is the second one.
    renderGrid(viewWith(['0:0', '0:1', '0:2'], [guessable('w1', CAR, 'car')]));

    cellInput(1, 0).focus();
    await act(async () => typeInto(1, 0, 'a'));

    expect(document.activeElement).toBe(cellInput(2, 0));
  });

  it('counts a word its crossings finished as answered, though nobody typed into it', async () => {
    // Every square of `CAR` happens to be covered by words the others solved.
    // Its owner typed nothing, but the word is on the board and right, and
    // leaving it open would keep the game from ever finishing.
    await act(async () => {
      renderGrid(viewWith(['0:0', '1:0', '2:0'], [guessable('w1', CAR, 'car')]));
    });

    expect(onSolved).toHaveBeenCalledExactlyOnceWith('w1');
  });

  it('says nothing about a word already recorded as answered', async () => {
    await act(async () => {
      renderGrid(viewWith(['0:0', '1:0', '2:0'], [guessable('w1', CAR, 'car', true)]));
    });

    expect(onSolved).not.toHaveBeenCalled();
  });

  it('stops counting a refused write as done, so the next update sends it again', async () => {
    onSolved.mockRejectedValueOnce(new Error('Missing or insufficient permissions.'));
    const view = viewWith([], [guessable('w1', CAR, 'car')]);
    const { rerender } = renderGrid(view);

    await act(async () => {
      typeInto(0, 0, 'c');
      typeInto(1, 0, 'a');
      typeInto(2, 0, 'r');
    });

    expect(onSolved).toHaveBeenCalledOnce();

    // The next snapshot of the room redraws the grid; the answer is still on it.
    await act(async () => {
      rerender(<CrosswordGrid view={{ ...view }} onSolved={onSolved} />);
    });

    expect(onSolved).toHaveBeenCalledTimes(2);
  });

  describe('where two of the player own words cross', () => {
    const focusCell = (row: number, col: number) => act(() => cellInput(row, col).focus());

    it('follows the word being filled through the square the two of them share', () => {
      // `OAK` runs down through the middle of `EAT`. Typing must carry on down
      // at the shared square rather than turning along the other word.
      renderGrid(crossingView());

      focusCell(0, 1);
      typeInto(0, 1, 'o');
      expect(document.activeElement).toBe(cellInput(1, 1));

      typeInto(1, 1, 'a');
      expect(document.activeElement).toBe(cellInput(2, 1));

      act(() => typeInto(2, 1, 'k'));

      expect(onSolved).toHaveBeenCalledExactlyOnceWith('w1');
    });

    it('takes up the across word on a shared square, and swaps on a second click', () => {
      renderGrid(crossingView());

      focusCell(1, 1);
      expect(cellInput(1, 1)).toHaveAccessibleName(/filled across, where two of them cross/i);

      act(() => fireEvent.mouseDown(cellInput(1, 1)));
      expect(cellInput(1, 1)).toHaveAccessibleName(/filled down/i);

      act(() => fireEvent.mouseDown(cellInput(1, 1)));
      expect(cellInput(1, 1)).toHaveAccessibleName(/filled across/i);
    });

    it('picks a square up on the first click without swapping anything', () => {
      renderGrid(crossingView());

      // The click that moves the cursor onto a square must not also turn it
      // round: mousedown lands before the focus does.
      act(() => fireEvent.mouseDown(cellInput(1, 1)));
      focusCell(1, 1);

      expect(cellInput(1, 1)).toHaveAccessibleName(/filled across/i);
    });

    it('swaps from the keyboard as well, since a space is not a letter', () => {
      renderGrid(crossingView());

      focusCell(1, 1);
      act(() => fireEvent.keyDown(cellInput(1, 1), { key: ' ' }));

      expect(cellInput(1, 1)).toHaveAccessibleName(/filled down/i);
      expect(cellInput(1, 1)).toHaveValue('');
    });

    it('keeps what is typed in either word when the cursor swaps between them', () => {
      renderGrid(crossingView());

      focusCell(1, 0);
      typeInto(1, 0, 'e');
      typeInto(1, 1, 'a');

      focusCell(0, 1);
      act(() => typeInto(0, 1, 'o'));

      expect(cellInput(1, 0)).toHaveValue('E');
      expect(cellInput(1, 1)).toHaveValue('A');
      expect(cellInput(0, 1)).toHaveValue('O');
    });

    it('records each of the two words on its own once it is filled', () => {
      renderGrid(crossingView());

      focusCell(1, 0);
      typeInto(1, 0, 'e');
      typeInto(1, 1, 'a');
      act(() => typeInto(1, 2, 't'));

      expect(onSolved).toHaveBeenCalledExactlyOnceWith('w0');

      focusCell(0, 1);
      typeInto(0, 1, 'o');
      // The shared square already reads `A` from the across word — nothing to
      // type there — so the last letter of `OAK` is the one below it.
      act(() => typeInto(2, 1, 'k'));

      expect(onSolved).toHaveBeenCalledTimes(2);
      expect(onSolved).toHaveBeenLastCalledWith('w1');
    });

    it('carries typing along the word swapped to, not the one swapped from', () => {
      renderGrid(crossingView());

      focusCell(1, 1);
      act(() => fireEvent.keyDown(cellInput(1, 1), { key: ' ' }));
      typeInto(1, 1, 'a');

      // Down was swapped to, so the letter after the shared square is below it
      // rather than beside it.
      expect(document.activeElement).toBe(cellInput(2, 1));
    });

    it('says which way it is now filling, for a reader who cannot see the grid', () => {
      renderGrid(crossingView());
      const announcement = () => screen.getByText(/now filling/i);

      focusCell(1, 1);
      expect(announcement()).toHaveTextContent('Now filling across.');

      act(() => fireEvent.keyDown(cellInput(1, 1), { key: ' ' }));

      expect(announcement()).toHaveTextContent('Now filling down.');
    });

    it('hands a shared square back to the word still open when the other is solved', () => {
      // The player was filling `OAK` when it was answered. Its squares are no
      // longer theirs to type in, and the word still open takes over without
      // the cursor being left pointing at something that has gone.
      const { rerender } = renderGrid(crossingView());

      focusCell(1, 1);
      act(() => fireEvent.keyDown(cellInput(1, 1), { key: ' ' }));
      expect(cellInput(1, 1)).toHaveAccessibleName(/filled down/i);

      act(() => {
        rerender(
          <CrosswordGrid
            view={{
              ...crossingView(),
              cells: crossingView().cells.map((cell) =>
                cell.col === 1 ? { ...cell, letter: 'OAK'[cell.row]! } : cell,
              ),
              toGuess: [guessable('w0', EAT, 'eat'), guessable('w1', OAK, 'oak', true)],
            }}
            onSolved={onSolved}
          />,
        );
      });

      expect(screen.queryByLabelText(/row 2, column 2\b/i)).not.toBeInTheDocument();
      expect(cellInput(1, 0)).toHaveAccessibleName(/filled across/i);

      act(() => typeInto(1, 0, 'e'));

      // The shared square is filled in already, so typing skips straight past it.
      expect(document.activeElement).toBe(cellInput(1, 2));
    });

    it('explains the swap to a player who has a crossing, and to nobody else', () => {
      const { unmount } = renderGrid(crossingView());

      expect(screen.getByText(/press the space bar to swap/i)).toBeInTheDocument();
      unmount();

      renderGrid(viewWith([], [guessable('w1', CAR, 'car')]));

      expect(screen.queryByText(/press the space bar to swap/i)).not.toBeInTheDocument();
    });
  });

  it('leaves a square alone when the space bar has nothing to swap to', () => {
    renderGrid(viewWith([], [guessable('w1', CAR, 'car')]));

    act(() => cellInput(1, 0).focus());
    act(() => fireEvent.keyDown(cellInput(1, 0), { key: ' ' }));

    expect(cellInput(1, 0)).toHaveValue('');
    expect(cellInput(1, 0)).toHaveAccessibleName(/filled down/i);
    expect(cellInput(1, 0)).not.toHaveAccessibleName(/cross/i);
  });

  it('takes one letter per square and nothing that is not a letter', () => {
    renderGrid(viewWith([], [guessable('w1', CAR, 'car')]));

    typeInto(0, 0, '4');
    expect(cellInput(0, 0)).toHaveValue('');

    typeInto(0, 0, ' ');
    expect(cellInput(0, 0)).toHaveValue('');

    typeInto(0, 0, 'q');
    expect(cellInput(0, 0)).toHaveValue('Q');

    typeInto(0, 0, '');
    expect(cellInput(0, 0)).toHaveValue('');
  });
});
