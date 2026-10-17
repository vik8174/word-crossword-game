import { ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ExplainedWord } from '../rooms/word-visibility';
import { theme } from '../theme';
import { WatchedWordList } from './WatchedWordList';

const word = (id: string, text: string, isSolved: boolean): ExplainedWord =>
  ({ id, number: 1, orientation: 'across', word: text, isSolved }) as unknown as ExplainedWord;

const renderList = (words: readonly ExplainedWord[]) =>
  render(
    <ThemeProvider theme={theme}>
      <WatchedWordList labelledBy="h" words={words} kind="playing" />
    </ThemeProvider>,
  );

describe('a word row', () => {
  it('sets the state before the word and the word last, while the DOM keeps the word first', () => {
    renderList([word('w1', 'bread', true)]);

    const wordEl = screen.getByText('bread');
    const stateEl = screen.getByText(/answered/);
    expect(getComputedStyle(stateEl).order).toBe('1');
    expect(getComputedStyle(wordEl).order).toBe('2');
    expect(getComputedStyle(wordEl).textAlign).toBe('right');
    expect(wordEl.compareDocumentPosition(stateEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('puts the free space after the reference, so the word ends at the row edge', () => {
    renderList([word('w1', 'bread', false)]);

    const ref = screen.getByText('bread').previousElementSibling as HTMLElement;
    expect(getComputedStyle(ref).marginRight).toBe('auto');
  });
});
