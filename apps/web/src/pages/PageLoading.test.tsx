import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageLoading } from './PageLoading';

describe('PageLoading', () => {
  it('says a page is on its way rather than showing nothing', () => {
    render(<PageLoading />);

    expect(screen.getByRole('progressbar', { name: /loading/i })).toBeInTheDocument();
  });
});
