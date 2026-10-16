import { ThemeProvider } from '@mui/material/styles';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { theme } from '../theme';
import { FEW, gameRoom, GUEST_ID, lessonRoom, OWNER_ID, TEACHER_ID } from './drawn-room';
import { Frame } from './Frame';
import { FrameSlotProvider } from './FrameSlotProvider';
import { RoomClosedEarly } from './RoomClosedEarly';
import { RoomFinished } from './RoomFinished';
import { RoomGame } from './RoomGame';
import { RoomLobby } from './RoomLobby';
import { RoomUnavailableNotice } from './RoomUnavailableNotice';

/**
 * The name in the frame's header leads to the home page outside a live room
 * (issue #298), and is plain text in the lobby and in every state of the game,
 * so that a stray tap cannot take a player out of a room.
 */

const NAME = 'Across the Street';

const drawn = (ui: ReactElement) =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <FrameSlotProvider>
          <Frame />
          {ui}
        </FrameSlotProvider>
      </MemoryRouter>
    </ThemeProvider>,
  );

const banner = () => within(screen.getByRole('banner'));

const expectLink = () => {
  const link = banner().getByRole('link', { name: NAME });

  expect(link).toHaveAttribute('href', '/');
};

const expectPlain = () => {
  expect(banner().queryByRole('link')).toBeNull();
  expect(screen.getByRole('banner').querySelector('a')).toBeNull();
  expect(banner().getByText(NAME)).toBeInTheDocument();
};

const pairLobby = () => gameRoom(FEW, 7, 9, {}, false, 'lobby');
const lessonLobby = () => lessonRoom(FEW, 7, 9, { status: 'lobby' });

describe('the name in the header, outside a live room', () => {
  it('is a link to the home page, reached by keyboard', () => {
    drawn(<RoomUnavailableNotice reason="expired" />);

    expectLink();
    expect(banner().getByRole('link', { name: NAME })).not.toHaveAttribute('tabindex', '-1');
  });

  it.each(['missing', 'expired', 'started', 'finished', 'full', 'refused', 'connection'] as const)(
    'is a link on the %s notice',
    (reason) => {
      drawn(<RoomUnavailableNotice reason={reason} />);

      expectLink();
    },
  );

  it.each([
    [
      'a pair game finished',
      () => <RoomFinished room={gameRoom(FEW, 7, 9, {}, false, 'completed')} viewerId={OWNER_ID} />,
    ],
    [
      'a pair game ended early',
      () => <RoomClosedEarly room={gameRoom(FEW, 7, 9, {}, false, 'closed')} viewerId={GUEST_ID} />,
    ],
    [
      'a lesson finished, for its teacher',
      () => (
        <RoomFinished room={lessonRoom(FEW, 7, 9, { status: 'completed' })} viewerId={TEACHER_ID} />
      ),
    ],
    [
      'a lesson ended early, for its teacher',
      () => (
        <RoomClosedEarly room={lessonRoom(FEW, 7, 9, { status: 'closed' })} viewerId={TEACHER_ID} />
      ),
    ],
  ])('is a link on %s', (_name, ending) => {
    drawn(ending());

    expectLink();
  });

  it('opens the home page in the same tab without leaving the app', () => {
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/create']}>
          <FrameSlotProvider>
            <Frame />
            <Routes>
              <Route path="/" element={<p>the home page</p>} />
              <Route path="/create" element={<p>the create page</p>} />
            </Routes>
          </FrameSlotProvider>
        </MemoryRouter>
      </ThemeProvider>,
    );

    const notPrevented = fireEvent.click(banner().getByRole('link', { name: NAME }));

    // React Router handles the click itself and stops the browser following the href.
    expect(notPrevented).toBe(false);
    expect(screen.getByText('the home page')).toBeInTheDocument();
  });
});

describe('the name in the header, in a live room', () => {
  it.each([
    [
      'a pair game lobby',
      () => <RoomLobby roomId="room-1" room={pairLobby()} viewerId={OWNER_ID} />,
    ],
    [
      'a lesson lobby',
      () => <RoomLobby roomId="room-1" room={lessonLobby()} viewerId={TEACHER_ID} />,
    ],
    [
      'the pair game, for the owner',
      () => <RoomGame roomId="room-1" room={gameRoom(FEW, 7, 9)} viewerId={OWNER_ID} />,
    ],
    [
      'the pair game, for the guest',
      () => <RoomGame roomId="room-1" room={gameRoom(FEW, 7, 9)} viewerId={GUEST_ID} />,
    ],
    [
      'the lesson, for its teacher',
      () => <RoomGame roomId="room-1" room={lessonRoom(FEW, 7, 9)} viewerId={TEACHER_ID} />,
    ],
    [
      'the lesson, for a student',
      () => <RoomGame roomId="room-1" room={lessonRoom(FEW, 7, 9)} viewerId="olena-uid" />,
    ],
  ])('is plain text in %s', (_name, screenOfRoom) => {
    drawn(screenOfRoom());

    expectPlain();
  });
});
