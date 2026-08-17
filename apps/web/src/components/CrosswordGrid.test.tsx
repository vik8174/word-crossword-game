import { act, fireEvent, render, screen } from '@testing-library/react';
import { checkGuess, type GridPosition } from 'shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GridCellView, GridView, GuessableWord, WordLocation } from '../rooms/word-visibility';
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
    // The grid draws the number a *square* carries, handed to it per cell, so
    // the number on a word is never read here. One will do for all of them.
    number: 1,
    orientation: cells[0]?.row === cells[1]?.row ? 'across' : 'down',
    cells,
    isSolved,
    accepts: (guess: string) => checkGuess(guess, word),
  }) satisfies GuessableWord;

/** What one square holds, with a solved word taking the square from an explained one. */
const contentFor = (
  key: string,
  revealed: readonly string[],
  explained: readonly string[],
): GridCellView['content'] => {
  if (revealed.includes(key)) {
    return { kind: 'solved', letter: LETTERS[key]! };
  }

  if (explained.includes(key)) {
    return { kind: 'explained', letter: LETTERS[key]! };
  }

  return { kind: 'empty' };
};

/**
 * A board whose squares show a letter only when named in `revealed` or in
 * `explained` — exactly what `gridViewFor` hands over for the words the group
 * has answered and for the ones this player explains.
 *
 * Numbers are handed over the same way: a square carries one when `numbered`
 * names it, and the grid draws what it is given rather than working out where
 * the words begin (that is `numberCrossword`, tested where it lives).
 */
const viewWith = (
  revealed: readonly string[],
  toGuess: readonly GuessableWord[],
  numbered: Readonly<Record<string, number>> = {},
  explained: readonly string[] = [],
): GridView => ({
  rows: 3,
  cols: 3,
  cells: Object.keys(LETTERS).map((key): GridCellView => {
    const [row, col] = key.split(':').map(Number);

    return {
      row: row!,
      col: col!,
      content: contentFor(key, revealed, explained),
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
    .map((cell): GridCellView => ({ ...cell, content: { kind: 'empty' }, number: null })),
  toGuess: [guessable('w0', EAT, 'eat'), guessable('w1', OAK, 'oak')],
});

/**
 * One square of the board, whoever it belongs to.
 *
 * Every square says where it is, because every square can be moved onto — the
 * arrows cross the whole grid. What tells the player's own squares apart is
 * what the rest of the label says, which is what {@link typeableSquares} asks.
 */
const squareAt = (row: number, col: number) =>
  screen.getByLabelText(new RegExp(`Row ${row + 1}, column ${col + 1}\\b`, 'i'));

/** Every square this player may type in, and no other. */
const typeableSquares = () => screen.getAllByLabelText(/a letter of one of your words/i);

const typeInto = (row: number, col: number, letter: string) =>
  fireEvent.change(squareAt(row, col), { target: { value: letter } });

/** Presses a key on the square the cursor is standing on, as a player would. */
const press = (key: string) =>
  act(() => {
    fireEvent.keyDown(document.activeElement ?? document.body, { key });
  });

const onSolved = vi.fn<(wordId: string) => Promise<void>>();

const renderGrid = (view: GridView) => render(<CrosswordGrid view={view} onSolved={onSolved} />);

/** Everything the board itself says, numbers and letters alike. */
const board = () => screen.getByRole('group', { name: /crossword grid/i });

/**
 * What the board says with its numbering taken out — which is to say, the
 * letters on it and nothing else. What a square is beyond its letter is said in
 * its label rather than written on the board.
 */
const boardLetters = () => (board().textContent ?? '').replaceAll(/\d/g, '');

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
    expect(squareAt(0, 0)).toHaveValue('');
  });

  it('shows a solved word as letters nobody can type over', () => {
    renderGrid(viewWith(['0:0', '0:1', '0:2'], [guessable('w1', CAR, 'car')]));

    expect(board().textContent).toContain('CAT');
    // The square is on the board and can be moved onto; it is simply not this
    // player's to type in, and says so.
    expect(squareAt(0, 1)).toHaveAccessibleName(/^row 1, column 2 — A$/i);
  });

  it('lets a player type only into the squares of their own words', () => {
    renderGrid(viewWith([], [guessable('w1', CAR, 'car')]));

    expect(typeableSquares()).toHaveLength(CAR.length);
    expect(squareAt(0, 2)).toHaveAccessibleName(/^row 1, column 3 — empty$/i);
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

      // Everything the board says, in full: the number this player types
      // under, the number of a square that is somebody else's, and nothing
      // else at all.
      expect(board().textContent).toBe('12');
    });

    it('says the number to a player typing into that square', () => {
      renderGrid(viewWith([], [guessable('w1', CAR, 'car')], NUMBERED));

      // The number leads: it is what the players call the word by out loud.
      expect(squareAt(0, 0)).toHaveAccessibleName(
        /^Number 1, row 1, column 1 — a letter of one of your words/i,
      );
      expect(squareAt(1, 0)).toHaveAccessibleName(/^Row 2, column 1\b/i);
    });

    it("says the number over a square that is nobody's to type in", () => {
      renderGrid(viewWith(['0:0', '0:1', '0:2'], [guessable('w1', CAR, 'car')], NUMBERED));

      // A solved square holds nothing but a letter, so its number has to be in
      // what the square says of itself or a reader loses it.
      expect(squareAt(0, 0)).toHaveAccessibleName(/^Number 1, row 1, column 1 — C$/i);
      expect(board().textContent).toMatch(/C.*A.*T/);
    });
  });

  describe('the words this player explains', () => {
    /** `CAT` across the top is this player's to explain; `CAR` down is theirs to guess. */
    const explainingCat = () =>
      viewWith([], [guessable('w1', CAR, 'car')], {}, ['0:0', '0:1', '0:2']);

    /** The same three squares, but answered by the group rather than explained. */
    const solvedCat = () => viewWith(['0:0', '0:1', '0:2'], [guessable('w1', CAR, 'car')]);

    it('writes the word into the grid, in place, and adds nothing else to the board', () => {
      renderGrid(explainingCat());

      expect(boardLetters()).toBe('CAT');
    });

    it('lets nobody type over a letter it has written in', () => {
      renderGrid(explainingCat());

      // `CAR` starts in the square the explained `CAT` already fills, so what
      // is left of it to type is the two squares below.
      expect(typeableSquares()).toHaveLength(2);
      expect(squareAt(0, 0)).toHaveAccessibleName(/^row 1, column 1 — C, yours to explain$/i);
    });

    it('counts a letter it wrote in towards the word crossing it', async () => {
      // The `C` is in front of the player and it is right; asking them to
      // retype it would be asking them to copy what they can already read.
      renderGrid(explainingCat());

      await act(async () => {
        typeInto(1, 0, 'a');
        typeInto(2, 0, 'r');
      });

      expect(onSolved).toHaveBeenCalledExactlyOnceWith('w1');
    });

    it('says which squares are this player own to explain, for a reader who cannot see them', () => {
      renderGrid(explainingCat());

      expect(screen.getAllByLabelText(/yours to explain/i)).toHaveLength(3);
    });

    it('draws it apart from a word the group answered, without relying on colour', () => {
      const { unmount } = renderGrid(explainingCat());

      // A dashed outline and a slanted letter, either of which survives a
      // screen read in greyscale by somebody who cannot tell the tints apart.
      expect(screen.getByText('T')).toHaveStyle({ borderStyle: 'dashed', fontStyle: 'italic' });
      unmount();

      renderGrid(solvedCat());

      expect(screen.getByText('T')).toHaveStyle({ borderStyle: 'solid', fontStyle: 'normal' });
    });

    it('keeps the number of the square readable over it', () => {
      renderGrid(viewWith([], [guessable('w1', CAR, 'car')], { '0:0': 1 }, ['0:0', '0:1', '0:2']));

      // The number is drawn over an explained square as over any other, and
      // said in what the square says of itself.
      expect(board().textContent).toContain('1');
      expect(squareAt(0, 0)).toHaveAccessibleName(
        /^Number 1, row 1, column 1 — C, yours to explain$/i,
      );
    });

    it('turns the word plain once its guesser has answered it', () => {
      const { rerender } = renderGrid(explainingCat());
      expect(screen.getAllByLabelText(/yours to explain/i)).toHaveLength(3);

      rerender(<CrosswordGrid view={solvedCat()} onSolved={onSolved} />);

      // Nothing new appears — the letters were already there — but they stop
      // being this player's alone, which is what tells them to stop explaining.
      expect(boardLetters()).toBe('CAT');
      expect(screen.queryByLabelText(/yours to explain/i)).not.toBeInTheDocument();
      expect(screen.getByText('T')).toHaveStyle({ borderStyle: 'solid' });
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
    expect(squareAt(0, 0)).toHaveValue('B');
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

    expect(squareAt(0, 0)).toHaveValue('');
    expect(squareAt(1, 0)).toHaveValue('');
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
    expect(squareAt(1, 0)).toHaveValue('');

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
    expect(squareAt(1, 0)).toHaveValue('');
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

    expect(squareAt(0, 0)).toHaveValue('C');
    expect(squareAt(1, 0)).toHaveValue('');
    expect(squareAt(2, 0)).toHaveValue('');

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

    squareAt(0, 0).focus();
    typeInto(0, 0, 'c');

    expect(document.activeElement).toBe(squareAt(1, 0));
  });

  it('skips over a square a crossing word already filled in', async () => {
    // `CAR` reads down from the shared `C`, so the first square this player can
    // type in is the second one.
    renderGrid(viewWith(['0:0', '0:1', '0:2'], [guessable('w1', CAR, 'car')]));

    squareAt(1, 0).focus();
    await act(async () => typeInto(1, 0, 'a'));

    expect(document.activeElement).toBe(squareAt(2, 0));
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
    const focusCell = (row: number, col: number) => act(() => squareAt(row, col).focus());

    it('follows the word being filled through the square the two of them share', () => {
      // `OAK` runs down through the middle of `EAT`. Typing must carry on down
      // at the shared square rather than turning along the other word.
      renderGrid(crossingView());

      focusCell(0, 1);
      typeInto(0, 1, 'o');
      expect(document.activeElement).toBe(squareAt(1, 1));

      typeInto(1, 1, 'a');
      expect(document.activeElement).toBe(squareAt(2, 1));

      act(() => typeInto(2, 1, 'k'));

      expect(onSolved).toHaveBeenCalledExactlyOnceWith('w1');
    });

    it('takes up the across word on a shared square, and swaps on a second click', () => {
      renderGrid(crossingView());

      focusCell(1, 1);
      expect(squareAt(1, 1)).toHaveAccessibleName(/filled across, where two of them cross/i);

      act(() => fireEvent.mouseDown(squareAt(1, 1)));
      expect(squareAt(1, 1)).toHaveAccessibleName(/filled down/i);

      act(() => fireEvent.mouseDown(squareAt(1, 1)));
      expect(squareAt(1, 1)).toHaveAccessibleName(/filled across/i);
    });

    it('picks a square up on the first click without swapping anything', () => {
      renderGrid(crossingView());

      // The click that moves the cursor onto a square must not also turn it
      // round: mousedown lands before the focus does.
      act(() => fireEvent.mouseDown(squareAt(1, 1)));
      focusCell(1, 1);

      expect(squareAt(1, 1)).toHaveAccessibleName(/filled across/i);
    });

    it('swaps from the keyboard as well, since a space is not a letter', () => {
      renderGrid(crossingView());

      focusCell(1, 1);
      act(() => fireEvent.keyDown(squareAt(1, 1), { key: ' ' }));

      expect(squareAt(1, 1)).toHaveAccessibleName(/filled down/i);
      expect(squareAt(1, 1)).toHaveValue('');
    });

    it('keeps what is typed in either word when the cursor swaps between them', () => {
      renderGrid(crossingView());

      focusCell(1, 0);
      typeInto(1, 0, 'e');
      typeInto(1, 1, 'a');

      focusCell(0, 1);
      act(() => typeInto(0, 1, 'o'));

      expect(squareAt(1, 0)).toHaveValue('E');
      expect(squareAt(1, 1)).toHaveValue('A');
      expect(squareAt(0, 1)).toHaveValue('O');
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
      act(() => fireEvent.keyDown(squareAt(1, 1), { key: ' ' }));
      typeInto(1, 1, 'a');

      // Down was swapped to, so the letter after the shared square is below it
      // rather than beside it.
      expect(document.activeElement).toBe(squareAt(2, 1));
    });

    it('says which way it is now filling, for a reader who cannot see the grid', () => {
      renderGrid(crossingView());
      const announcement = () => screen.getByText(/now filling/i);

      focusCell(1, 1);
      expect(announcement()).toHaveTextContent('Now filling across.');

      act(() => fireEvent.keyDown(squareAt(1, 1), { key: ' ' }));

      expect(announcement()).toHaveTextContent('Now filling down.');
    });

    it('hands a shared square back to the word still open when the other is solved', () => {
      // The player was filling `OAK` when it was answered. Its squares are no
      // longer theirs to type in, and the word still open takes over without
      // the cursor being left pointing at something that has gone.
      const { rerender } = renderGrid(crossingView());

      focusCell(1, 1);
      act(() => fireEvent.keyDown(squareAt(1, 1), { key: ' ' }));
      expect(squareAt(1, 1)).toHaveAccessibleName(/filled down/i);

      act(() => {
        rerender(
          <CrosswordGrid
            view={{
              ...crossingView(),
              cells: crossingView().cells.map((cell) =>
                cell.col === 1
                  ? { ...cell, content: { kind: 'solved' as const, letter: 'OAK'[cell.row]! } }
                  : cell,
              ),
              toGuess: [guessable('w0', EAT, 'eat'), guessable('w1', OAK, 'oak', true)],
            }}
            onSolved={onSolved}
          />,
        );
      });

      expect(squareAt(1, 1)).toHaveAccessibleName(/^row 2, column 2 — A$/i);
      expect(squareAt(1, 0)).toHaveAccessibleName(/filled across/i);

      act(() => typeInto(1, 0, 'e'));

      // The shared square is filled in already, so typing skips straight past it.
      expect(document.activeElement).toBe(squareAt(1, 2));
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

    act(() => squareAt(1, 0).focus());
    act(() => fireEvent.keyDown(squareAt(1, 0), { key: ' ' }));

    expect(squareAt(1, 0)).toHaveValue('');
    expect(squareAt(1, 0)).toHaveAccessibleName(/filled down/i);
    expect(squareAt(1, 0)).not.toHaveAccessibleName(/cross/i);
  });

  describe('moving about the board', () => {
    /** Puts the cursor on a square, as clicking it does. */
    const takeUp = (row: number, col: number) => act(() => squareAt(row, col).focus());

    /** What the grid says it is filling right now, said for a reader, not drawn. */
    const announcement = () => screen.queryByText(/now filling/i);

    it('crosses squares that are nobody to type in', () => {
      renderGrid(viewWith([], [guessable('w1', CAR, 'car')]));

      takeUp(0, 0);
      press('ArrowRight');

      // `CAR` runs down the left column; the square to the right of its first
      // is part of a word somebody else is filling in. The cursor goes there
      // all the same, and there is nothing to type when it arrives.
      expect(document.activeElement).toBe(squareAt(0, 1));
      expect(squareAt(0, 1)).toHaveAccessibleName(/^row 1, column 2 — empty$/i);
      expect(boardLetters()).toBe('');
    });

    it('holds the word being filled where this player has none running that way', () => {
      renderGrid(viewWith([], [guessable('w0', CAT, 'cat')]));

      takeUp(0, 0);
      press('ArrowDown');

      // Nothing of this player's runs down from there, so the arrow moves the
      // cursor and leaves the word they were filling in alone.
      expect(document.activeElement).toBe(squareAt(1, 0));
      expect(announcement()).toHaveTextContent('Now filling across.');
    });

    it('stays where it is when the board ends that way', () => {
      renderGrid(crossingView());

      takeUp(1, 0);
      press('ArrowDown');

      expect(document.activeElement).toBe(squareAt(1, 0));
    });

    it('says the square it arrived at, for a reader who cannot see the grid', () => {
      renderGrid(viewWith([], [guessable('w1', CAR, 'car')], {}, ['0:0', '0:1', '0:2']));

      takeUp(1, 0);
      press('ArrowUp');

      // The cursor is state, but the browser's focus follows it — which is the
      // whole of how a move is heard rather than only seen.
      expect(document.activeElement).toHaveAccessibleName(
        /^row 1, column 1 — C, yours to explain$/i,
      );
    });

    it('marks the square the next letter lands in, apart from the word being filled', () => {
      renderGrid(crossingView());

      takeUp(1, 0);

      // Both squares are of the word being filled and are tinted alike; only
      // the one the letter is about to land in carries the ring.
      expect(squareAt(1, 0)).toHaveStyle({ outlineStyle: 'solid', outlineWidth: '3px' });
      expect(squareAt(1, 2)).not.toHaveStyle({ outlineStyle: 'solid' });
      expect(getComputedStyle(squareAt(1, 2)).backgroundColor).toBe(
        getComputedStyle(squareAt(1, 0)).backgroundColor,
      );
    });

    it('is one stop for the Tab key, wherever the cursor stands', () => {
      renderGrid(crossingView());
      const tabStops = () => [...board().querySelectorAll('[tabindex="0"]')];

      // Eighty squares would otherwise be eighty stops on the way past the grid.
      expect(tabStops()).toHaveLength(1);

      takeUp(1, 2);

      expect(tabStops()).toEqual([squareAt(1, 2)]);
    });

    describe('where two of the player own words cross', () => {
      it('switches to the word running the way the arrow went', () => {
        renderGrid(crossingView());

        takeUp(1, 1);
        press('ArrowUp');

        expect(document.activeElement).toBe(squareAt(0, 1));
        expect(announcement()).toHaveTextContent('Now filling down.');
      });

      it('keeps the cursor and the next letter together across a crossing', () => {
        // The defect PR #26 fixed once, arriving from the other side: press
        // down while filling an across word, and if the across word stayed
        // active the next letter lands to the right of where the cursor now is.
        renderGrid(crossingView());

        takeUp(1, 0);
        typeInto(1, 0, 'e');
        press('ArrowDown');
        expect(document.activeElement).toBe(squareAt(2, 1));

        press('ArrowUp');
        act(() => typeInto(1, 1, 'a'));

        expect(document.activeElement).toBe(squareAt(2, 1));
        expect(squareAt(1, 2)).toHaveValue('');
      });
    });

    describe('backspace', () => {
      it('clears the letter in the square the cursor is in', () => {
        renderGrid(viewWith([], [guessable('w1', CAR, 'car')]));

        takeUp(0, 0);
        typeInto(0, 0, 'c');
        press('ArrowUp');
        press('Backspace');

        expect(squareAt(0, 0)).toHaveValue('');
        expect(document.activeElement).toBe(squareAt(0, 0));
      });

      it('steps back along the word and clears there when the square is empty', () => {
        renderGrid(viewWith([], [guessable('w1', CAR, 'car')]));

        takeUp(0, 0);
        typeInto(0, 0, 'c');
        typeInto(1, 0, 'a');
        press('Backspace');

        expect(squareAt(1, 0)).toHaveValue('');
        expect(squareAt(0, 0)).toHaveValue('C');
        expect(document.activeElement).toBe(squareAt(1, 0));
      });

      it('has nowhere to step back to at the start of a word', () => {
        renderGrid(viewWith([], [guessable('w1', CAR, 'car')]));

        takeUp(0, 0);
        press('Backspace');

        expect(document.activeElement).toBe(squareAt(0, 0));
        expect(squareAt(0, 0)).toHaveValue('');
      });

      it('never takes back a letter that was written in rather than typed', () => {
        renderGrid(viewWith([], [guessable('w1', CAR, 'car')], {}, ['0:0', '0:1', '0:2']));

        takeUp(1, 0);
        press('ArrowUp');
        press('Backspace');

        // The `C` belongs to the word this player explains. It is not theirs to
        // lose, and stepping back over it is what typing forward already does.
        expect(boardLetters()).toBe('CAT');
      });
    });
  });

  describe('reaching a word by name', () => {
    const reachFor = (view: GridView, word: WordLocation) =>
      render(<CrosswordGrid view={view} onSolved={onSolved} wordToReach={word} />);

    it('goes to a word of this player own, ready for the next letter', () => {
      reachFor(crossingView(), { cells: OAK, orientation: 'down' });

      expect(document.activeElement).toBe(squareAt(0, 1));

      typeInto(0, 1, 'o');

      expect(document.activeElement).toBe(squareAt(1, 1));
    });

    it('skips to the first square of it that is still open', () => {
      // `CAR` begins in the square the explained `CAT` already fills, and that
      // letter is nobody's to type over.
      reachFor(viewWith([], [guessable('w1', CAR, 'car')], {}, ['0:0', '0:1', '0:2']), {
        cells: CAR,
        orientation: 'down',
      });

      expect(document.activeElement).toBe(squareAt(1, 0));
    });

    it('brings a word this player explains into view without making it typeable', () => {
      reachFor(viewWith([], [guessable('w1', CAR, 'car')], {}, ['0:0', '0:1', '0:2']), {
        cells: CAT,
        orientation: 'across',
      });

      expect(document.activeElement).toHaveAccessibleName(/yours to explain/i);
      // Nothing has been taken up to fill: the word is read, not answered.
      expect(screen.queryByText(/now filling/i)).not.toBeInTheDocument();
      expect(typeableSquares()).toHaveLength(2);
    });

    it('takes the player back to a word they ask for a second time', () => {
      const view = crossingView();
      const { rerender } = render(
        <CrosswordGrid
          view={view}
          onSolved={onSolved}
          wordToReach={{ cells: OAK, orientation: 'down' }}
        />,
      );

      act(() => squareAt(1, 0).focus());
      expect(document.activeElement).toBe(squareAt(1, 0));

      rerender(
        <CrosswordGrid
          view={view}
          onSolved={onSolved}
          wordToReach={{ cells: OAK, orientation: 'down' }}
        />,
      );

      expect(document.activeElement).toBe(squareAt(0, 1));
    });
  });

  it('takes one letter per square and nothing that is not a letter', () => {
    renderGrid(viewWith([], [guessable('w1', CAR, 'car')]));

    typeInto(0, 0, '4');
    expect(squareAt(0, 0)).toHaveValue('');

    typeInto(0, 0, ' ');
    expect(squareAt(0, 0)).toHaveValue('');

    typeInto(0, 0, 'q');
    expect(squareAt(0, 0)).toHaveValue('Q');

    typeInto(0, 0, '');
    expect(squareAt(0, 0)).toHaveValue('');
  });
});
