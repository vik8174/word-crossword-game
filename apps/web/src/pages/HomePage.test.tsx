import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  it('renders the game title', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: /word crossword game/i })).toBeInTheDocument();
  });

  it('renders content sourced from the packages/shared workspace package', () => {
    render(<HomePage />);

    // Proves apps/web can actually import from packages/shared end-to-end
    // (module resolution + TS types + build), not just that both packages
    // build independently side by side.
    expect(screen.getByText(/shared/i)).toBeInTheDocument();
  });
});
