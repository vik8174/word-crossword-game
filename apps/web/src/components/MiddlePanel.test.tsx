import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BAND_SOLID } from '../garden/scene-palette';
import { MiddlePanel } from './MiddlePanel';

describe('MiddlePanel', () => {
  it("holds what a screen at the doors has to say, on the template's opaque band", () => {
    render(<MiddlePanel>What is there</MiddlePanel>);

    const panel = screen.getByText('What is there');

    expect(panel).toHaveStyle({ backgroundColor: BAND_SOLID, borderRadius: '2px' });
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
