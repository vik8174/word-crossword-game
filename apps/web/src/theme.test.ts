import { describe, expect, it } from 'vitest';
import { theme } from './theme';

describe('theme', () => {
  it('defines a light-mode palette with the brand primary color', () => {
    expect(theme.palette.mode).toBe('light');
    expect(theme.palette.primary.main).toBe('#1565c0');
  });
});
