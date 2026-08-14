import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { HomePage } from './HomePage';

const renderHomePage = () =>
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );

describe('HomePage', () => {
  it('renders the game title', () => {
    renderHomePage();

    expect(screen.getByRole('heading', { name: /word crossword game/i })).toBeInTheDocument();
  });

  it('offers the way into a new game', () => {
    renderHomePage();

    expect(screen.getByRole('link', { name: /create a game/i })).toHaveAttribute('href', '/create');
  });
});
