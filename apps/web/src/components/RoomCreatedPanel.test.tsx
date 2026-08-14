import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RoomCreatedPanel } from './RoomCreatedPanel';

const ORIGIN = 'https://crossword.example';
const ROOM_URL = `${ORIGIN}/room/room-1`;

/** jsdom ships no clipboard; each test installs the behaviour it needs. */
const stubClipboard = (writeText: () => Promise<void>) => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
};

const renderPanel = () => render(<RoomCreatedPanel roomId="room-1" origin={ORIGIN} />);

afterEach(() => {
  vi.clearAllMocks();
});

describe('RoomCreatedPanel', () => {
  it('shows the whole link, so it can be copied by hand as well', () => {
    renderPanel();

    expect(screen.getByLabelText(/room link/i)).toHaveValue(ROOM_URL);
  });

  it('puts the link on the clipboard and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /copy link/i }));

    expect(await screen.findByText(/link copied/i)).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(ROOM_URL);
  });

  it('asks the owner to copy by hand when the browser refuses clipboard access', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('Write permission denied.')));
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /copy link/i }));

    expect(await screen.findByText(/copy it by hand/i)).toBeInTheDocument();
  });
});
