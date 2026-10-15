import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useJustAnswered } from './use-just-answered';

describe('useJustAnswered', () => {
  it('pegs no card in a room opened with words already on the line', () => {
    const { result } = renderHook(() => useJustAnswered(['cat', 'car']));

    expect(result.current).toBeUndefined();
  });

  it('names the card of a word answered while the screen is open, and keeps naming it', () => {
    const { result, rerender } = renderHook(({ words }) => useJustAnswered(words), {
      initialProps: { words: ['cat'] },
    });

    rerender({ words: ['cat', 'car'] });
    expect(result.current).toBe('car');

    rerender({ words: ['cat', 'car'] });
    expect(result.current).toBe('car');
  });

  it('moves on to the next answer when there is one', () => {
    const { result, rerender } = renderHook(({ words }) => useJustAnswered(words), {
      initialProps: { words: [] as string[] },
    });

    rerender({ words: ['cat'] });
    rerender({ words: ['cat', 'car'] });

    expect(result.current).toBe('car');
  });
});
