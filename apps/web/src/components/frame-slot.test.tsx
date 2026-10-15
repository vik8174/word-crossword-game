import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { type FrameSlotContent, useFrameSlot, useFrameSlotContent } from './frame-slot';
import { FrameSlotProvider } from './FrameSlotProvider';

/** What the frame would draw from the slot, as text. */
const Shown = () => {
  const { status, action } = useFrameSlotContent();

  return (
    <>
      <p data-testid="status">{status}</p>
      <p data-testid="action">{action}</p>
    </>
  );
};

/** A screen that fills the slot, as a route does. */
const Filler = ({ content }: { readonly content: FrameSlotContent }) => {
  useFrameSlot(content);

  return null;
};

const statusShown = () => screen.getByTestId('status').textContent;

/** The slot, and what is drawn from it, around the fillers given. */
const around = (...fillers: ReactNode[]) => (
  <FrameSlotProvider>
    <Shown />
    {fillers}
  </FrameSlotProvider>
);

describe('the frame slot', () => {
  it('is empty until a screen fills it', () => {
    render(around());

    expect(statusShown()).toBe('');
    expect(screen.getByTestId('action').textContent).toBe('');
  });

  it('shows what a screen puts in it, and follows it when it changes', () => {
    const { rerender } = render(
      around(<Filler key="a" content={{ status: 'Waiting for Ana', action: 'Start' }} />),
    );

    expect(statusShown()).toBe('Waiting for Ana');
    expect(screen.getByTestId('action').textContent).toBe('Start');

    rerender(around(<Filler key="a" content={{ status: 'Playing with Ana', action: 'End' }} />));

    expect(statusShown()).toBe('Playing with Ana');
    expect(screen.getByTestId('action').textContent).toBe('End');
  });

  it('is emptied when the route that filled it is left', () => {
    const { rerender } = render(around(<Filler key="a" content={{ status: 'Lobby' }} />));

    rerender(around());

    expect(statusShown()).toBe('');
  });

  it('keeps the arriving screen’s status when the leaving screen is unmounted afterwards', () => {
    // A screen can be mounted while the one it replaces is still mounted, and
    // the old one unmounted a moment later. A filler that cleared the slot on
    // unmount would wipe the arriving screen's line then.
    const leaving = <Filler key="leaving" content={{ status: 'Lobby' }} />;
    const arriving = <Filler key="arriving" content={{ status: 'Playing with Ana' }} />;

    const { rerender } = render(around(leaving));

    rerender(around(leaving, arriving));
    expect(statusShown()).toBe('Playing with Ana');

    rerender(around(arriving));
    expect(statusShown()).toBe('Playing with Ana');
  });

  it('shows the screen mounted last even when an earlier one changes its line', () => {
    const arriving = <Filler key="arriving" content={{ status: 'Playing with Ana' }} />;
    const { rerender } = render(around(<Filler key="leaving" content={{ status: 'Lobby' }} />));

    rerender(around(<Filler key="leaving" content={{ status: 'Lobby' }} />, arriving));
    rerender(around(<Filler key="leaving" content={{ status: 'Lobby, still' }} />, arriving));

    expect(statusShown()).toBe('Playing with Ana');
  });

  it('does nothing where there is no frame to fill', () => {
    render(<Filler content={{ status: 'Alone in a story' }} />);

    expect(screen.queryByText('Alone in a story')).not.toBeInTheDocument();
  });
});
