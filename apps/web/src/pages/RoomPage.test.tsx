import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { signInAnonymously } from 'firebase/auth';
import { onSnapshot, updateDoc } from 'firebase/firestore';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ROOM_ROUTE_PATTERN, roomPath } from '../rooms/room-link';
import { RoomPage } from './RoomPage';

// Firebase is the system boundary: mocked so a player can be walked through the
// whole screen without a project. Everything above it — the access rules, the
// document guard, the grid — runs for real.
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ name: 'auth' })),
  signInAnonymously: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ name: 'firestore' })),
  collection: vi.fn(),
  addDoc: vi.fn(),
  doc: vi.fn(() => ({ path: 'rooms/room-1' })),
  onSnapshot: vi.fn(),
  updateDoc: vi.fn(),
}));

const HOUR_MS = 60 * 60 * 1000;

const timestamp = (millis: number) => ({ toMillis: () => millis });

/** A one-word crossword whose letters must never reach the screen. */
const LAYOUT = {
  rows: 1,
  cols: 3,
  cells: [
    { row: 0, col: 0, letter: 'C' },
    { row: 0, col: 1, letter: 'A' },
    { row: 0, col: 2, letter: 'T' },
  ],
  placedWords: [
    {
      word: 'cat',
      orientation: 'across',
      cells: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ],
    },
  ],
  unplacedWords: [],
};

const player = (nickname: string, joinedAtMillis = 1000) => ({
  nickname,
  joinedAt: timestamp(joinedAtMillis),
});

/** A room as Firestore hands it back, alive unless told otherwise. */
const storedRoom = (overrides: Record<string, unknown> = {}) => ({
  status: 'lobby',
  ownerId: 'owner-uid',
  layout: LAYOUT,
  words: { w0: { hiddenFromPlayerId: null, guessedByPlayerId: null } },
  players: { 'owner-uid': player('Vik') },
  createdAt: timestamp(Date.now() - HOUR_MS),
  expiresAt: timestamp(Date.now() + HOUR_MS),
  ...overrides,
});

/** The snapshot callbacks Firestore would drive the subscription with. */
let emitRoom: (snapshot: { exists: () => boolean; data: () => unknown }) => void;
let failSubscription: (error: unknown) => void;
const unsubscribe = vi.fn();

const renderRoomPage = () =>
  render(
    <MemoryRouter initialEntries={[roomPath('room-1')]}>
      <Routes>
        <Route path={ROOM_ROUTE_PATTERN} element={<RoomPage />} />
      </Routes>
    </MemoryRouter>,
  );

/** Opens the room screen and lets Firestore deliver the room behind the link. */
const openRoom = async (room: unknown = storedRoom()) => {
  renderRoomPage();

  await waitFor(() => expect(onSnapshot).toHaveBeenCalled());
  await act(async () => {
    emitRoom({ exists: () => true, data: () => room });
  });
};

const joinAs = (nickname: string) => {
  fireEvent.change(screen.getByLabelText(/nickname/i), { target: { value: nickname } });
  fireEvent.click(screen.getByRole('button', { name: /join the game/i }));
};

beforeEach(() => {
  // Cleared here rather than after each test: unmounting the previous screen is
  // itself an `afterEach`, and it calls the unsubscribe spy this file asserts on.
  vi.clearAllMocks();
  vi.mocked(signInAnonymously).mockResolvedValue({ user: { uid: 'guest-uid' } } as never);
  vi.mocked(updateDoc).mockResolvedValue(undefined);
  vi.mocked(onSnapshot).mockImplementation(((
    _reference: unknown,
    onNext: typeof emitRoom,
    onError: typeof failSubscription,
  ) => {
    emitRoom = onNext;
    failSubscription = onError;

    return unsubscribe;
  }) as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RoomPage', () => {
  describe('arriving at the link', () => {
    it('signs the visitor in before reading the room, not after asking for a nickname', async () => {
      let signIn: (() => void) | undefined;
      vi.mocked(signInAnonymously).mockReturnValue(
        new Promise((resolve) => {
          signIn = () => resolve({ user: { uid: 'guest-uid' } } as never);
        }) as never,
      );

      renderRoomPage();

      // The security rules refuse a read from a visitor who is not signed in,
      // so nothing may be read until sign-in has come back.
      expect(onSnapshot).not.toHaveBeenCalled();
      expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();

      await act(async () => signIn?.());

      expect(onSnapshot).toHaveBeenCalledOnce();
    });

    it('asks a newcomer for a nickname', async () => {
      await openRoom();

      expect(screen.getByLabelText(/nickname/i)).toBeInTheDocument();
    });

    it('keeps the door shut until the nickname is usable', async () => {
      await openRoom();
      const join = screen.getByRole('button', { name: /join the game/i });

      expect(join).toBeDisabled();

      fireEvent.change(screen.getByLabelText(/nickname/i), { target: { value: '   ' } });
      expect(join).toBeDisabled();

      fireEvent.change(screen.getByLabelText(/nickname/i), { target: { value: 'Bob' } });
      expect(join).toBeEnabled();
    });

    it('stops following the room when the player leaves the screen', async () => {
      const { unmount } = renderRoomPage();
      await waitFor(() => expect(onSnapshot).toHaveBeenCalled());

      unmount();

      expect(unsubscribe).toHaveBeenCalledOnce();
    });
  });

  describe('joining', () => {
    it('adds the player to the room under their own auth id', async () => {
      await openRoom();

      joinAs('Bob');

      await waitFor(() =>
        expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
          'players.guest-uid': { nickname: 'Bob', joinedAt: expect.any(Date) },
        }),
      );
    });

    it('stores the nickname as the other players will read it', async () => {
      await openRoom();

      joinAs('  Bob   the   Builder ');

      await waitFor(() =>
        expect(updateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            'players.guest-uid': expect.objectContaining({ nickname: 'Bob the Builder' }),
          }),
        ),
      );
    });

    it('shows the room as soon as the player is in it', async () => {
      await openRoom();
      joinAs('Bob');

      await act(async () => {
        emitRoom({
          exists: () => true,
          data: () =>
            storedRoom({
              players: { 'owner-uid': player('Vik'), 'guest-uid': player('Bob', 2000) },
            }),
        });
      });

      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();
    });

    it('explains a join the database refused, and lets the player try again', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(updateDoc).mockRejectedValue(new Error('Missing or insufficient permissions.'));
      await openRoom();

      joinAs('Bob');

      expect(await screen.findByText(/could not join the game/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /join the game/i })).toBeEnabled();
    });
  });

  describe('inside the room', () => {
    const roomWithBoth = storedRoom({
      players: { 'owner-uid': player('Vik'), 'guest-uid': player('Bob', 2000) },
    });

    it('lets a player who is already in straight back to the game', async () => {
      await openRoom(roomWithBoth);

      expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();
      expect(screen.getByText('Vik')).toBeInTheDocument();
    });

    it('shows everyone in the room, in the order they joined', async () => {
      await openRoom(roomWithBoth);

      const names = screen.getAllByRole('listitem').map((item) => item.textContent);

      expect(names[0]).toContain('Vik');
      expect(names[1]).toContain('Bob');
    });

    it('shows a player arriving without anyone reloading the page', async () => {
      await openRoom(roomWithBoth);

      expect(screen.queryByText('Cara')).not.toBeInTheDocument();

      await act(async () => {
        emitRoom({
          exists: () => true,
          data: () =>
            storedRoom({
              players: {
                'owner-uid': player('Vik'),
                'guest-uid': player('Bob', 2000),
                'third-uid': player('Cara', 3000),
              },
            }),
        });
      });

      expect(screen.getByText('Cara')).toBeInTheDocument();
    });

    it('draws the crossword without giving a single letter away', async () => {
      await openRoom(roomWithBoth);

      const grid = screen.getByRole('img', { name: /crossword grid/i });

      expect(grid).toBeInTheDocument();
      expect(grid.textContent).toBe('');
      expect(screen.queryByText(/\bcat\b/i)).not.toBeInTheDocument();
    });
  });

  describe('a link that leads nowhere', () => {
    it('says so when the room was never there or has already been cleaned up', async () => {
      renderRoomPage();
      await waitFor(() => expect(onSnapshot).toHaveBeenCalled());

      await act(async () => {
        emitRoom({ exists: () => false, data: () => undefined });
      });

      expect(screen.getByText(/no game at this link/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();
    });

    it('says so when the address carries no room id at all', () => {
      render(
        <MemoryRouter>
          <RoomPage />
        </MemoryRouter>,
      );

      expect(screen.getByText(/no game at this link/i)).toBeInTheDocument();
    });
  });

  describe('a room that cannot be joined', () => {
    it('explains an expired room instead of letting the write be refused', async () => {
      await openRoom(storedRoom({ expiresAt: timestamp(Date.now() - HOUR_MS) }));

      expect(screen.getByText(/room has expired/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();
      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('explains an expired room even to a player who was in it', async () => {
      await openRoom(
        storedRoom({
          players: { 'guest-uid': player('Bob') },
          expiresAt: timestamp(Date.now() - HOUR_MS),
        }),
      );

      expect(screen.getByText(/room has expired/i)).toBeInTheDocument();
    });

    it('turns away a fifth player', async () => {
      const crowd = Object.fromEntries(
        ['a', 'b', 'c', 'd'].map((id, index) => [id, player(id.toUpperCase(), index)]),
      );

      await openRoom(storedRoom({ players: crowd }));

      expect(screen.getByText(/already full/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();
    });
  });

  describe('when Firebase cannot be reached', () => {
    it('says so when the visitor could not be signed in', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(signInAnonymously).mockRejectedValue(new Error('auth/network-request-failed'));

      renderRoomPage();

      expect(await screen.findByText(/could not reach the game/i)).toBeInTheDocument();
      expect(onSnapshot).not.toHaveBeenCalled();
    });

    it('says so when following the room breaks down', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      renderRoomPage();
      await waitFor(() => expect(onSnapshot).toHaveBeenCalled());

      await act(async () => {
        failSubscription(new Error('Missing or insufficient permissions.'));
      });

      expect(screen.getByText(/could not reach the game/i)).toBeInTheDocument();
    });
  });
});
