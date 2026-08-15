import { render, screen } from '@testing-library/react';
import type { CrosswordLayout } from 'shared';
import { describe, expect, it } from 'vitest';

import { CrosswordGridOutline } from './CrosswordGridOutline';

/** Two crossing words in a 3x3 board, so most of the board has no cell at all. */
const LAYOUT: CrosswordLayout = {
  rows: 3,
  cols: 3,
  cells: [
    { row: 0, col: 0, letter: 'C' },
    { row: 0, col: 1, letter: 'A' },
    { row: 0, col: 2, letter: 'T' },
    { row: 1, col: 0, letter: 'A' },
    { row: 2, col: 0, letter: 'R' },
  ],
  placedWords: [],
  unplacedWords: [],
};

const grid = () => screen.getByRole('img', { name: /crossword grid/i });

describe('CrosswordGridOutline', () => {
  it('gives away no letter of the words it is drawn from', () => {
    render(<CrosswordGridOutline layout={LAYOUT} />);

    expect(grid().textContent).toBe('');
  });

  it('draws the whole board, empty squares included', () => {
    render(<CrosswordGridOutline layout={LAYOUT} />);

    expect(grid().childElementCount).toBe(LAYOUT.rows * LAYOUT.cols);
  });

  it('describes the board to anyone who cannot see it', () => {
    render(<CrosswordGridOutline layout={LAYOUT} />);

    expect(grid()).toHaveAccessibleName(/3 by 3, 5 squares to fill/i);
  });

  it('survives a layout with nothing in it', () => {
    render(
      <CrosswordGridOutline
        layout={{ rows: 0, cols: 0, cells: [], placedWords: [], unplacedWords: [] }}
      />,
    );

    expect(grid().childElementCount).toBe(0);
  });
});
