import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useDocumentVisible } from './use-document-visible';

/**
 * Puts the tab in front or behind, the way a browser would.
 *
 * jsdom has the property and the event but nothing that ever changes one or
 * fires the other, so both are done by hand.
 *
 * @param state - What the document should say it is
 */
const setVisibility = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
};

afterEach(() => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  vi.restoreAllMocks();
});

describe('useDocumentVisible', () => {
  it('starts out saying the tab is being looked at', () => {
    const { result } = renderHook(() => useDocumentVisible());

    expect(result.current).toBe(true);
  });

  it('notices the tab going behind another one, and coming back', () => {
    const { result } = renderHook(() => useDocumentVisible());

    setVisibility('hidden');
    expect(result.current).toBe(false);

    setVisibility('visible');
    expect(result.current).toBe(true);
  });

  it('stops listening once nothing is asking', () => {
    const stopListening = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => useDocumentVisible());

    unmount();

    expect(stopListening).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });
});
