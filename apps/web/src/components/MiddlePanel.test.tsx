import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { theme } from '../theme';
import { MiddlePanel } from './MiddlePanel';

describe('MiddlePanel', () => {
  it('holds what a screen at the doors has to say, on a tile with a line outline', () => {
    render(<MiddlePanel>What is there</MiddlePanel>);

    const panel = screen.getByText('What is there');
    const { tile, line } = theme.palette.street;

    expect(panel).toHaveStyle({ backgroundColor: tile, borderRadius: '2px' });
    expect(getComputedStyle(panel).outline.toLowerCase()).toBe(`1.5px solid ${line}`.toLowerCase());
    expect(getComputedStyle(panel).boxShadow).toBe('');
    expect(getComputedStyle(panel).padding).toBe('24px 24px 26px');
  });

  it("is no wider than the template's 430px, or 92% of where it stands", () => {
    render(<MiddlePanel>What is there</MiddlePanel>);

    expect(getComputedStyle(screen.getByText('What is there')).width).toBe('min(26.875rem, 92%)');
  });

  it('is left-aligned unless the screen centres it', () => {
    const { rerender } = render(<MiddlePanel>What is there</MiddlePanel>);

    expect(screen.getByText('What is there')).not.toHaveStyle({ textAlign: 'center' });

    rerender(<MiddlePanel centred>What is there</MiddlePanel>);

    expect(screen.getByText('What is there')).toHaveStyle({ textAlign: 'center' });
  });
});
