import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { roomPath } from '../rooms/room-link';
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

const renderPanel = () =>
  render(
    <MemoryRouter>
      <RoomCreatedPanel roomId="room-1" origin={ORIGIN} />
    </MemoryRouter>,
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('RoomCreatedPanel', () => {
  it('shows the whole link, so it can be copied by hand as well', () => {
    renderPanel();

    expect(screen.getByLabelText(/room link/i)).toHaveValue(ROOM_URL);
  });

  it('offers the way in as a real link, without taking the invitation off the screen', () => {
    renderPanel();

    // A link rather than a button that navigates: middle-clicking it, opening
    // it in a new tab and seeing where it leads are all things an owner does
    // with an address of the app.
    expect(screen.getByRole('link', { name: /enter the room/i })).toHaveAttribute(
      'href',
      roomPath('room-1'),
    );
    // Sharing is still what this panel is for — entering was added to it, not
    // put in its place.
    expect(screen.getByLabelText(/room link/i)).toHaveValue(ROOM_URL);
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
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
