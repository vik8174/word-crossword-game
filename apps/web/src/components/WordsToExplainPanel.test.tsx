import { fireEvent, render, screen } from '@testing-library/react';
import type { GridPosition } from 'shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExplainedWord, WordLocation } from '../rooms/word-visibility';
import { WordsToExplainPanel } from './WordsToExplainPanel';

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

const onSelectWord = vi.fn<(location: WordLocation) => void>();

const renderPanel = (words: readonly ExplainedWord[]) =>
  render(<WordsToExplainPanel words={words} onSelectWord={onSelectWord} />);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('WordsToExplainPanel', () => {
  it('names every word this player explains, by its number and its direction', () => {
    renderPanel([explained('w0', 3, 'apple'), explained('w2', 7, 'bread')]);

    expect(screen.getByText('3 across')).toBeInTheDocument();
    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.getByText('7 across')).toBeInTheDocument();
    expect(screen.getByText('bread')).toBeInTheDocument();
  });

  it('says a word is done in words, not only by striking it through', () => {
    renderPanel([explained('w0', 3, 'apple', true)]);

    // Said outright in the row's accessible name, whatever the eye is given —
    // and struck through as well, so the mark beside it is never the only cue.
    expect(screen.getByRole('button', { name: '3 across — apple — answered' })).toBeInTheDocument();
    expect(screen.getByText('apple')).toHaveStyle({ textDecoration: 'line-through' });
  });

  it('explains the mark in its hint', () => {
    renderPanel([explained('w0', 3, 'apple')]);

    expect(screen.getByText(/A lit dot means it has been answered\./)).toBeInTheDocument();
  });

  it('reports where a tapped word runs, and nothing that could be spelled out', () => {
    renderPanel([explained('w0', 3, 'apple')]);

    fireEvent.click(screen.getByRole('button', { name: '3 across — apple' }));

    // This is the half of the game that has words to leak: they are on this
    // player's own screen, and they stop at this call all the same.
    expect(onSelectWord).toHaveBeenCalledExactlyOnceWith({ orientation: 'across', cells: CELLS });
  });

  it('reports the same word again when its entry is tapped again', () => {
    // A player who taps a word, wanders off across the grid and taps it again
    // is asking to be taken back, not asking for nothing.
    renderPanel([explained('w0', 3, 'apple')]);
    const wordEntry = () => screen.getByRole('button', { name: '3 across — apple' });

    fireEvent.click(wordEntry());
    fireEvent.click(wordEntry());

    expect(onSelectWord).toHaveBeenCalledTimes(2);
  });

  it('names its list by the half of the game it holds', () => {
    renderPanel([explained('w0', 3, 'apple')]);

    expect(screen.getByRole('list')).toHaveAccessibleName(/yours to explain/i);
  });
});
