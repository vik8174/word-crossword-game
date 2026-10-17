import { ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { theme } from '../theme';
import type { WordEntry } from './word-entry';
import { WordEntryList } from './WordEntryList';

const entry = (isSolved: boolean): WordEntry =>
  ({
    id: 'w1',
    reference: '1 across',
    shown: 'bread',
    look: 'word',
    name: '1 across, bread',
    location: { orientation: 'across', row: 0, col: 0 },
    isSolved,
  }) as unknown as WordEntry;

const renderList = (isSolved: boolean) =>
  render(
    <ThemeProvider theme={theme}>
      <WordEntryList labelledBy="h" entries={[entry(isSolved)]} onSelectWord={() => undefined} />
    </ThemeProvider>,
  );

describe("a player's word row", () => {
  it('sets the state before the word and the word last, while the DOM keeps the word first', () => {
    renderList(true);

    const wordEl = screen.getByText('bread');
    const stateEl = screen.getByText(/answered/);
    expect(getComputedStyle(stateEl).order).toBe('1');
    expect(getComputedStyle(wordEl).order).toBe('2');
    expect(getComputedStyle(wordEl).textAlign).toBe('right');
    expect(wordEl.compareDocumentPosition(stateEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('puts the free space after the reference, so the word ends at the row edge', () => {
    renderList(false);

    const ref = screen.getByText('bread').previousElementSibling as HTMLElement;
    expect(getComputedStyle(ref).marginRight).toBe('auto');
  });
});
