import { fireEvent, render, screen } from '@testing-library/react';
import { checkGuess, type GridPosition } from 'shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DealtWordView, ExplainedWord, GuessableWord } from '../rooms/word-visibility';
import { PlayerWordsPanel } from './PlayerWordsPanel';

const CELLS: readonly GridPosition[] = [
  { row: 0, col: 0 },
  { row: 0, col: 1 },
  { row: 0, col: 2 },
];

const explained = (id: string, number: number, word: string, isSolved = false): ExplainedWord => ({
  id,
  number,
  orientation: 'across',
  word,
  cells: CELLS,
  isSolved,
});

const guessable = (id: string, number: number, word: string, isSolved = false): GuessableWord => ({
  id,
  number,
  orientation: 'down',
  cells: CELLS,
  isSolved,
  accepts: (guess: string) => checkGuess(guess, word),
});

const onSelectWord = vi.fn<(word: ExplainedWord | GuessableWord) => void>();

const renderPanel = (view: DealtWordView) =>
  render(<PlayerWordsPanel view={view} onSelectWord={onSelectWord} />);

beforeEach(() => {
  vi.clearAllMocks();
});

const dealt = (
  toExplain: readonly ExplainedWord[],
  toGuess: readonly GuessableWord[],
): DealtWordView => ({ kind: 'dealt', toExplain, toGuess });

describe('PlayerWordsPanel', () => {
  it('names every word this player explains, by its number and its direction', () => {
    renderPanel(dealt([explained('w0', 3, 'apple'), explained('w2', 7, 'bread')], []));

    expect(screen.getByText('3 across — apple')).toBeInTheDocument();
    expect(screen.getByText('7 across — bread')).toBeInTheDocument();
  });

  it('numbers the words this player guesses without naming them or their length', () => {
    renderPanel(dealt([], [guessable('w1', 4, 'cheese')]));

    expect(screen.getByText('4 down — still to answer')).toBeInTheDocument();
    // Neither the word nor its length: working the spelling out is their game,
    // and the squares in the grid are the only thing that measures it.
    expect(document.body.textContent).not.toMatch(/cheese/i);
    expect(document.body.textContent).not.toMatch(/\b3 letters\b/i);
  });

  it('says a word is done in words, not only by striking it through', () => {
    renderPanel(dealt([explained('w0', 3, 'apple', true)], [guessable('w1', 4, 'cheese', true)]));

    // Struck through and recoloured for whoever is looking, and said outright
    // for whoever cannot tell grey from black.
    expect(screen.getByText('3 across — apple — answered')).toHaveStyle({
      textDecoration: 'line-through',
    });
    expect(screen.getByText('4 down — answered')).toBeInTheDocument();
  });

  it('reports how far this player has got with their own words', () => {
    renderPanel(dealt([], [guessable('w1', 4, 'cheese', true), guessable('w3', 5, 'dinner')]));

    expect(screen.getByRole('status')).toHaveTextContent('1 of 2 answered.');
  });

  describe('reaching a word from its entry', () => {
    it('reports the word behind a tapped entry, from either half of the game', () => {
      renderPanel(dealt([explained('w0', 3, 'apple')], [guessable('w1', 4, 'cheese')]));

      fireEvent.click(screen.getByRole('button', { name: '3 across — apple' }));

      expect(onSelectWord).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ id: 'w0', orientation: 'across', cells: CELLS }),
      );

      fireEvent.click(screen.getByRole('button', { name: '4 down — still to answer' }));

      expect(onSelectWord).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'w1', orientation: 'down', cells: CELLS }),
      );
    });

    it('reports the same word again when its entry is tapped again', () => {
      // A player who taps a word, wanders off across the grid and taps it again
      // is asking to be taken back, not asking for nothing.
      renderPanel(dealt([], [guessable('w1', 4, 'cheese')]));
      const wordEntry = () => screen.getByRole('button', { name: '4 down — still to answer' });

      fireEvent.click(wordEntry());
      fireEvent.click(wordEntry());

      expect(onSelectWord).toHaveBeenCalledTimes(2);
    });
  });

  it('keeps the two halves of the game apart, each under its own heading', () => {
    renderPanel(dealt([explained('w0', 3, 'apple')], [guessable('w1', 4, 'cheese')]));

    const lists = screen.getAllByRole('list');

    expect(lists[0]).toHaveAccessibleName(/yours to explain/i);
    expect(lists[1]).toHaveAccessibleName(/yours to guess/i);
  });
});
