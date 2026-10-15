import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Frame } from './Frame';
import { FRAME_HEADER_HEIGHT_PROPERTY } from './frame-height';
import { FrameSlotProvider } from './FrameSlotProvider';
import { useFrameSlot } from './frame-slot';
import { STATUS_SX, WORDMARK_SX } from './frame-styles';

const Filler = () => {
  useFrameSlot({ status: 'Playing with Ana', action: <button type="button">End game</button> });

  return null;
};

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.style.removeProperty(FRAME_HEADER_HEIGHT_PROPERTY);
});

describe('Frame', () => {
  it('is the banner of the page, with the name in it', () => {
    render(
      <FrameSlotProvider>
        <Frame />
      </FrameSlotProvider>,
    );

    expect(screen.getByRole('banner')).toHaveTextContent('Across the Street');
  });

  it('shows the status and the action a screen has put in the slot', () => {
    render(
      <FrameSlotProvider>
        <Frame />
        <Filler />
      </FrameSlotProvider>,
    );

    expect(screen.getByRole('banner')).toHaveTextContent('Playing with Ana');
    expect(screen.getByRole('button', { name: 'End game' })).toBeInTheDocument();
  });

  it('draws no status and no action while the slot is empty', () => {
    render(
      <FrameSlotProvider>
        <Frame />
      </FrameSlotProvider>,
    );

    expect(screen.getByRole('banner').children).toHaveLength(1);
  });

  it('sets the name 700, 20px, after a tile mark turned 6 degrees back', () => {
    expect(WORDMARK_SX.fontWeight).toBe(700);
    expect(WORDMARK_SX.fontSize).toBe('1.25rem');
    expect(WORDMARK_SX['&::before'].width).toBe('1rem');
    expect(WORDMARK_SX['&::before'].transform).toBe('rotate(-6deg)');
    expect(WORDMARK_SX['&::before'].boxShadow).toContain('2px 2px 0 0');
  });

  it('hides the status line under 768', () => {
    expect(STATUS_SX['@media (max-width: 767.95px)']).toEqual({ display: 'none' });
  });

  it('publishes its header’s border-box height, and takes it back when it goes', () => {
    let observed: ResizeObserverCallback | undefined;

    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          observed = callback;
        }
        observe() {}
        disconnect() {}
      },
    );

    const { unmount } = render(
      <FrameSlotProvider>
        <Frame />
      </FrameSlotProvider>,
    );

    vi.spyOn(screen.getByRole('banner'), 'getBoundingClientRect').mockReturnValue({
      height: 64,
    } as DOMRect);
    observed?.([], {} as ResizeObserver);

    expect(document.documentElement.style.getPropertyValue(FRAME_HEADER_HEIGHT_PROPERTY)).toBe(
      '64px',
    );

    unmount();

    expect(document.documentElement.style.getPropertyValue(FRAME_HEADER_HEIGHT_PROPERTY)).toBe('');
  });
});
