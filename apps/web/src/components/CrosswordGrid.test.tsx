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
 */
const viewWith = (revealed: readonly string[], toGuess: readonly GuessableWord[]): GridView => ({
  rows: 3,
  cols: 3,
  cells: Object.keys(LETTERS).map((key): GridCellView => {
    const [row, col] = key.split(':').map(Number);

    return { row: row!, col: col!, letter: revealed.includes(key) ? LETTERS[key]! : null };
  }),
  toGuess,
});

const cellInput = (row: number, col: number) =>
  screen.getByLabelText(new RegExp(`Row ${row + 1}, column ${col + 1}\\b`, 'i'));

const typeInto = (row: number, col: number, letter: string) =>
  fireEvent.change(cellInput(row, col), { target: { value: letter } });

const onSolved = vi.fn<(wordId: string) => Promise<void>>();

const renderGrid = (view: GridView) => render(<CrosswordGrid view={view} onSolved={onSolved} />);

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

    expect(screen.getByRole('group', { name: /crossword grid/i }).childElementCount).toBe(3 * 3);
  });

  it('gives away no letter while nothing has been solved', () => {
    renderGrid(viewWith([], [guessable('w1', CAR, 'car')]));

    expect(screen.getByRole('group', { name: /crossword grid/i }).textContent).toBe('');
    expect(cellInput(0, 0)).toHaveValue('');
  });

  it('shows a solved word as letters nobody can type over', () => {
    renderGrid(viewWith(['0:0', '0:1', '0:2'], [guessable('w1', CAR, 'car')]));

    expect(screen.getByRole('group', { name: /crossword grid/i }).textContent).toContain('CAT');
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

    expect(screen.getByRole('group', { name: /crossword grid/i }).textContent).toContain('CAT');
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

  it('offers the word again when the database refused to take it down', async () => {
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
