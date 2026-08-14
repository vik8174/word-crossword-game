import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  it('renders the game title', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: /word crossword game/i })).toBeInTheDocument();
  });
});
