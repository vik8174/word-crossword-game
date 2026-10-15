import { ThemeProvider } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AWAY_AFTER_MS, PRESENCE_TICK_MS } from '../rooms/presence';
import { theme } from '../theme';
import { JoinRoomForm } from './JoinRoomForm';
import { RoomJoin } from './RoomJoin';
import { RoomUnavailableNotice } from './RoomUnavailableNotice';

// Firebase is the system boundary; a join is never pressed in this file.
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ name: 'auth' })),
  signInAnonymously: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ name: 'firestore' })),
  collection: vi.fn(),
  addDoc: vi.fn(),
  doc: vi.fn(),
  onSnapshot: vi.fn(),
  updateDoc: vi.fn(),
  deleteField: vi.fn(),
}));
vi.mock('firebase/analytics', () => ({
  initializeAnalytics: vi.fn(),
  isSupported: vi.fn(() => Promise.resolve(false)),
  logEvent: vi.fn(),
  setDefaultEventParameters: vi.fn(),
}));

/**
 * The two doors a lesson words for itself: the join form, and the notices of a
 * third student and of one who comes after the deal (template lines 413-416 and
 * 899-909). A pair game's are `JoinRoomForm.test.tsx` and
 * `RoomUnavailableNotice.test.tsx`.
 */

const CLAUSE = ', and the teacher watching from the house at the end of the street';
const DOOR =
  'A neighbour waving from her balcony, holding out a line to an empty balcony across the street';

describe('JoinRoomForm, in a lesson', () => {
  it('is titled "Join the lesson" and invites to a lesson, by the teacher’s name', () => {
    render(
      <JoinRoomForm ownerNickname="Carmen" mode="lesson" onJoin={() => {}} isJoining={false} />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Join the lesson' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Carmen has invited you to a lesson. Pick a name the others will know you by.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Join the lesson' })).toBeInTheDocument();
  });

  it('says "Joining the lesson" while the join is written', () => {
    render(<JoinRoomForm ownerNickname="Carmen" mode="lesson" onJoin={() => {}} isJoining />);

    expect(screen.getByRole('button', { name: 'Joining the lesson' })).toBeDisabled();
  });

  it('keeps the pair game’s words when no mode is given', () => {
    render(<JoinRoomForm ownerNickname="Viktor" onJoin={() => {}} isJoining={false} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Join the game' })).toBeInTheDocument();
    expect(screen.queryByText(/lesson/i)).toBeNull();
  });
});

describe('RoomUnavailableNotice, in a lesson', () => {
  const renderNotice = (reason: Parameters<typeof RoomUnavailableNotice>[0]['reason']) =>
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <RoomUnavailableNotice reason={reason} mode="lesson" />
        </MemoryRouter>
      </ThemeProvider>,
    );

  it('refuses a third student with the lesson’s own notice, and sends them to their teacher', () => {
    renderNotice('full');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'This lesson is fullA lesson is played by two players, and this room has both of them. Ask your teacher which room is yours.',
    );
  });

  it('refuses one who arrives after the deal with the lesson’s own notice', () => {
    renderNotice('started');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'This lesson has already begunThe words were dealt out to the two players who were in the room at the time. Ask your teacher which room is yours.',
    );
  });

  it.each(['missing', 'expired', 'finished', 'refused', 'connection'] as const)(
    'says %s in the pair game’s words, which a lesson shares',
    (reason) => {
      renderNotice(reason);

      expect(screen.getByRole('alert')).not.toHaveTextContent(/lesson/i);
    },
  );

  it.each(['full', 'started'] as const)(
    'sends a student back to the home page on %s, not to a game of their own',
    (reason) => {
      renderNotice(reason);

      expect(screen.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute(
        'href',
        '/',
      );
      expect(screen.queryByRole('link', { name: 'Start a new game' })).toBeNull();
    },
  );

  it('keeps "Start a new game" on the refusals a lesson shares with the pair game', () => {
    renderNotice('expired');

    expect(screen.getByRole('link', { name: 'Start a new game' })).toHaveAttribute('href', '/');
  });

  it('still draws the shuttered balcony', () => {
    renderNotice('full');

    expect(
      screen.getByRole('img', { name: 'A balcony across the street with its shutters closed' }),
    ).toBeInTheDocument();
  });
});

describe('RoomJoin, in a lesson', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderDoor = (teacherSilentForMs: number) => {
    // Fixed once: the mark is a moment that was written, and the clock moves away from it.
    const lastSeenAt = Date.now() - teacherSilentForMs;

    return render(
      <ThemeProvider theme={theme}>
        <RoomJoin
          roomId="room-1"
          ownerNickname="Carmen"
          teacher={{
            nickname: 'Carmen',
            lastSeenAt: { toMillis: () => lastSeenAt } as never,
          }}
          playerId="olena-uid"
          seatToRelease={null}
          onRefused={() => {}}
        />
      </ThemeProvider>,
    );
  };

  it('draws the teacher at the end of the street and says so once, while their mark is fresh', () => {
    renderDoor(0);

    expect(screen.getByRole('img', { name: `${DOOR}${CLAUSE}` })).toBeInTheDocument();
  });

  it('draws the curtains and leaves the clause out once the teacher’s mark is old', () => {
    renderDoor(AWAY_AFTER_MS + 5000);

    expect(screen.getByRole('img', { name: DOOR })).toBeInTheDocument();
  });

  it('notices the teacher going quiet while the door stays open and nothing arrives', () => {
    renderDoor(AWAY_AFTER_MS - PRESENCE_TICK_MS / 2);
    expect(screen.getByRole('img', { name: `${DOOR}${CLAUSE}` })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(PRESENCE_TICK_MS);
    });

    expect(screen.getByRole('img', { name: DOOR })).toBeInTheDocument();
  });

  it('keeps the form worded for a lesson whether the teacher is here or not', () => {
    renderDoor(AWAY_AFTER_MS + 5000);

    expect(screen.getByRole('heading', { level: 1, name: 'Join the lesson' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/nickname/i), { target: { value: 'Olena' } });
    expect(screen.getByRole('button', { name: 'Join the lesson' })).toBeEnabled();
  });
});
