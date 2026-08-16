import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { signInAnonymously } from 'firebase/auth';
import { addDoc, onSnapshot } from 'firebase/firestore';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';
import type { NewRoomDocument } from './rooms/room-document';
import { roomPath } from './rooms/room-link';

/**
 * The owner's journey, across both screens it runs through: the word list on
 * `/create` and the room the link leads to.
 *
 * Kept apart from the page tests on purpose. Each of those covers one screen,
 * and the gap this file exists for lived exactly between them — the owner was
 * handed a link to their own room with nothing that took them there, which no
 * test of a single screen could see (issue #27).
 */

// Firebase is the system boundary: mocked so the whole journey can be walked
// without a project. Everything above it — validation, layout generation, the
// document that gets written, the access rules that read it back — runs for real.
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ name: 'auth' })),
  signInAnonymously: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ name: 'firestore' })),
  collection: vi.fn(() => ({ path: 'rooms' })),
  addDoc: vi.fn(),
  doc: vi.fn(() => ({ path: 'rooms/room-1' })),
  onSnapshot: vi.fn(),
  updateDoc: vi.fn(),
}));

const TEN_WORDS = 'apple, bread, cheese, dinner, engine, flower, garden, hunter, island, jacket';

/** Delivers the room to the screen that subscribed to it. */
let emitRoom: (snapshot: { exists: () => boolean; data: () => unknown }) => void;

/** Firestore stores a `Date` and hands it back as a `Timestamp`. */
const asTimestamp = (date: Date) => ({ toMillis: () => date.getTime() });

/**
 * The room as the owner's own creation left it in Firestore.
 *
 * Built from the document that was actually written rather than from a fixture,
 * so the room the owner walks into is the one they just created — a fixture
 * would let the two drift apart and still pass.
 */
const asStoredRoom = (written: NewRoomDocument) => ({
  ...written,
  players: Object.fromEntries(
    Object.entries(written.players).map(([playerId, player]) => [
      playerId,
      { ...player, joinedAt: asTimestamp(player.joinedAt) },
    ]),
  ),
  createdAt: asTimestamp(written.createdAt),
  expiresAt: asTimestamp(written.expiresAt),
});

/** The document `createRoom` wrote, typed as `unknown` by the Firestore mock. */
const writtenRoom = (): NewRoomDocument => {
  const [call] = vi.mocked(addDoc).mock.calls;

  return call?.[1] as unknown as NewRoomDocument;
};

/** Opens the app on the creation screen and creates a room from a valid list. */
const createRoom = () => {
  window.history.pushState({}, '', '/create');
  render(<App />);

  fireEvent.change(screen.getByLabelText(/nickname/i), { target: { value: 'Vik' } });
  fireEvent.change(screen.getByLabelText(/words/i), { target: { value: TEN_WORDS } });
  fireEvent.click(screen.getByRole('button', { name: /create room/i }));
};

beforeEach(() => {
  vi.mocked(signInAnonymously).mockResolvedValue({ user: { uid: 'owner-uid' } } as never);
  vi.mocked(addDoc).mockResolvedValue({ id: 'room-1' } as never);
  vi.mocked(onSnapshot).mockImplementation(((_reference: unknown, onNext: typeof emitRoom) => {
    emitRoom = onNext;

    return vi.fn();
  }) as never);
});

afterEach(() => {
  vi.clearAllMocks();
  window.history.pushState({}, '', '/');
});

describe('the owner of a room', () => {
  it('walks from the word list into their own room, as a player already in it', async () => {
    createRoom();
    await screen.findByLabelText(/room link/i);

    fireEvent.click(screen.getByRole('link', { name: /enter the room/i }));

    await waitFor(() => expect(onSnapshot).toHaveBeenCalled());
    await act(async () => {
      emitRoom({ exists: () => true, data: () => asStoredRoom(writtenRoom()) });
    });

    // On the board of the room they created, without being asked who they are:
    // `createRoom` already put them in `players`.
    expect(window.location.pathname).toBe(roomPath('room-1'));
    expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: /crossword grid/i })).toBeInTheDocument();

    const [owner] = screen.getAllByRole('listitem');

    expect(owner).toHaveTextContent('Vik');
    expect(owner).toHaveTextContent(/host/i);
  });

  it('is left with the room to share until they choose to walk in', async () => {
    createRoom();

    await screen.findByLabelText(/room link/i);

    // Nothing has taken them anywhere: the link is usually sent before the owner
    // goes in, and a room they were pushed into would take that away from them.
    expect(window.location.pathname).toBe('/create');
    expect(onSnapshot).not.toHaveBeenCalled();
  });
});
