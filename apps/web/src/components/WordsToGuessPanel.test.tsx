import { fireEvent, render, screen } from '@testing-library/react';
import { checkGuess, type GridPosition } from 'shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GuessableWord, WordLocation } from '../rooms/word-visibility';
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
  it('numbers the words this player guesses without naming them or their length', () => {
    renderPanel([guessable('w1', 4, 'cheese')]);

    expect(screen.getByText('4 down — still to answer')).toBeInTheDocument();
    // Neither the word nor its length: working the spelling out is their game,
    // and the squares in the grid are the only thing that measures it.
    expect(document.body.textContent).not.toMatch(/cheese/i);
    expect(document.body.textContent).not.toMatch(/\b3 letters\b/i);
  });

  it('says a word is done in words, not only by striking it through', () => {
    renderPanel([guessable('w1', 4, 'cheese', true)]);

    expect(screen.getByText('4 down — answered')).toHaveStyle({ textDecoration: 'line-through' });
  });

  it('reports how far this player has got with their own words', () => {
    renderPanel([guessable('w1', 4, 'cheese', true), guessable('w3', 5, 'dinner')]);

    expect(screen.getByRole('status')).toHaveTextContent('1 of 2 answered.');
  });

  it('reports where a tapped word runs, exactly as the other half does', () => {
    renderPanel([guessable('w1', 4, 'cheese')]);

    fireEvent.click(screen.getByRole('button', { name: '4 down — still to answer' }));

    expect(onSelectWord).toHaveBeenCalledExactlyOnceWith({ orientation: 'down', cells: CELLS });
  });

  it('reports the same word again when its entry is tapped again', () => {
    renderPanel([guessable('w1', 4, 'cheese')]);
    const wordEntry = () => screen.getByRole('button', { name: '4 down — still to answer' });

    fireEvent.click(wordEntry());
    fireEvent.click(wordEntry());

    expect(onSelectWord).toHaveBeenCalledTimes(2);
  });

  it('names its list by the half of the game it holds', () => {
    renderPanel([guessable('w1', 4, 'cheese')]);

    expect(screen.getByRole('list')).toHaveAccessibleName(/yours to guess/i);
  });
});
