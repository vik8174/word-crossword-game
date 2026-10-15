import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { dotSx } from './button-styles';
import { WaitingMark } from './WaitingMark';

describe('WaitingMark', () => {
  it('says what is being waited for, as a status', () => {
    render(<WaitingMark>Connecting to the game…</WaitingMark>);

    expect(screen.getByRole('status')).toHaveTextContent('Connecting to the game…');
  });

  it('is not a spinner: nothing in it is a progressbar', () => {
    render(<WaitingMark>Connecting to the game…</WaitingMark>);

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('keeps the dot out of what a reader is told', () => {
    render(<WaitingMark>Connecting to the game…</WaitingMark>);

    const dot = screen.getByRole('status').querySelector('[aria-hidden="true"]');

    expect(dot).not.toBeNull();
  });

  it("beats the button's dot at 12px and stands still under reduced motion", () => {
    const dot = dotSx(12) as Record<string, unknown>;

    expect(dot.width).toBe('0.75rem');
    expect(dot.animation).toBe('pulse 900ms ease-in-out infinite alternate');
    expect(dot['@media (prefers-reduced-motion: reduce)']).toEqual({ animation: 'none' });
  });
});
