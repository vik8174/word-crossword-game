import { ThemeProvider } from '@mui/material/styles';
import { fireEvent, render, screen } from '@testing-library/react';
import { checkGuess, type GridPosition } from 'shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GuessableWord, WordLocation } from '../rooms/word-visibility';
import { theme } from '../theme';
import { WordsToGuessPanel } from './WordsToGuessPanel';

const CELLS: readonly GridPosition[] = [
  { row: 0, col: 0 },
  { row: 0, col: 1 },
  { row: 0, col: 2 },
];

const guessable = (id: string, number: number, word: string, isSolved = false): GuessableWord => ({
  id,
  number,
  orientation: 'down',
  cells: CELLS,
  isSolved,
  accepts: (guess: string) => checkGuess(guess, word),
});

const onSelectWord = vi.fn<(location: WordLocation) => void>();

const renderPanel = (words: readonly GuessableWord[]) =>
  render(<WordsToGuessPanel words={words} onSelectWord={onSelectWord} />);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('WordsToGuessPanel', () => {
  it('numbers the words this player guesses and shows one blank for each letter, never the word', () => {
    renderPanel([guessable('w1', 4, 'cheese')]);

    expect(screen.getByText('4 down')).toBeInTheDocument();
    // The count of letters is the drawing's own (`.slots`); the letters are
    // what working the spelling out is for, and the grid is the only thing that
    // measures them.
    expect(screen.getByText('___')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/cheese/i);
  });

  it('does not mirror what is typed into the grid', () => {
    // The letters being typed live in the grid, and lifting them out is not
    // this list's to do (issue #228; the drawing's "ap___" is the one allowed
    // difference).
    renderPanel([guessable('w1', 4, 'cheese')]);

    expect(screen.getByText('___')).toBeInTheDocument();
  });

  it('shows the word itself once it has been answered, as the board spells it', () => {
    renderPanel([guessable('w1', 4, 'cat', true)]);
    const { unmount } = render(
      <WordsToGuessPanel
        words={[guessable('w1', 4, 'cat', true)]}
        onSelectWord={onSelectWord}
        spellings={new Map([['w1', 'cat']])}
      />,
    );

    expect(screen.getAllByText('cat')).toHaveLength(1);
    unmount();
  });

  it('says a word is done in words, with a tick, not only by colour', () => {
    renderPanel([guessable('w1', 4, 'cheese', true)]);

    const row = screen.getByRole('button', { name: '4 down, 3 letters, answered' });

    expect(row).toBeInTheDocument();
    expect(row).toHaveTextContent('✓ answered');
  });

  it('reports how far this player has got with their own words', () => {
    renderPanel([guessable('w1', 4, 'cheese', true), guessable('w3', 5, 'dinner')]);

    expect(screen.getByRole('status')).toHaveTextContent('1 of 2 answered.');
  });

  it('reports where a tapped word runs, exactly as the other half does', () => {
    renderPanel([guessable('w1', 4, 'cheese')]);

    fireEvent.click(screen.getByRole('button', { name: '4 down, 3 letters, still to answer' }));

    expect(onSelectWord).toHaveBeenCalledExactlyOnceWith({ orientation: 'down', cells: CELLS });
  });

  it('reports the same word again when its entry is tapped again', () => {
    renderPanel([guessable('w1', 4, 'cheese')]);
    const wordEntry = () =>
      screen.getByRole('button', { name: '4 down, 3 letters, still to answer' });

    fireEvent.click(wordEntry());
    fireEvent.click(wordEntry());

    expect(onSelectWord).toHaveBeenCalledTimes(2);
  });

  it('names its list by the half of the game it holds', () => {
    renderPanel([guessable('w1', 4, 'cheese')]);

    expect(screen.getByRole('list')).toHaveAccessibleName('You guess');
  });

  it('sets its heading in the text family at the bold weight', () => {
    // Issue #147 dropped the serif that used to carry the panel headings —
    // checked on the rendered element's computed style, the way a screen
    // actually resolves it, rather than on the theme's own config object.
    render(
      <ThemeProvider theme={theme}>
        <WordsToGuessPanel words={[guessable('w1', 4, 'cheese')]} onSelectWord={onSelectWord} />
      </ThemeProvider>,
    );

    const style = getComputedStyle(screen.getByRole('heading', { name: 'You guess' }));

    expect(style.fontFamily).toMatch(/Alegreya Sans/);
    expect(style.fontWeight).toBe('700');
  });
});
