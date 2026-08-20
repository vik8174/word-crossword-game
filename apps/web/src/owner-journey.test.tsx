import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { signInAnonymously } from 'firebase/auth';
import { addDoc, onSnapshot } from 'firebase/firestore';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';
import type { NewRoomDocument } from './rooms/room-document';
import { roomPath, roomUrl } from './rooms/room-link';

/**
 * The owner's journey, across both screens it runs through: the word list on
 * `/create` and the room the link leads to.
 *
 * Kept apart from the page tests on purpose. Each of those covers one screen,
 * and the gap this file exists for lives exactly between them — creation used
 * to end on `/create` with the room in component state, so a reload lost the
 * room and the words that built it, which no test of a single screen could see
 * (issues #27 and #48).
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
  // The SDK's word for "this field goes", which taking a seat writes.
  deleteField: vi.fn(() => ({ field: 'deleted' })),
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
      {
        ...player,
        joinedAt: asTimestamp(player.joinedAt),
        ...(player.lastSeenAt === undefined ? {} : { lastSeenAt: asTimestamp(player.lastSeenAt) }),
      },
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
  it('lands in their own room, at its own address, and stays there through a reload', async () => {
    createRoom();

    // Taken in by the write coming back, with nothing to click: the room screen
    // is subscribing before a single snapshot has arrived.
    await waitFor(() => expect(onSnapshot).toHaveBeenCalled());
    expect(window.location.pathname).toBe(roomPath('room-1'));
    // Not yet: nothing has been read, and a link nobody has been recognised as
    // the host of would be a link shown to whoever opened the address.
    expect(screen.queryByLabelText(/room link/i)).not.toBeInTheDocument();

    await act(async () => {
      emitRoom({ exists: () => true, data: () => asStoredRoom(writtenRoom()) });
    });

    // The room says who made it, so the link is theirs to send, and the seat it
    // leads to is still empty.
    expect(screen.getByLabelText(/room link/i)).toHaveValue(
      roomUrl('room-1', window.location.origin),
    );

    // In the room they created, without being asked who they are: `createRoom`
    // already put them in `players`.
    expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Vik');
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent(/host/i);

    // The reload this ticket exists for: everything the screen knew is thrown
    // away and the app is opened again at the address the browser is on.
    cleanup();
    render(<App />);

    await waitFor(() => expect(onSnapshot).toHaveBeenCalledTimes(2));
    await act(async () => {
      emitRoom({ exists: () => true, data: () => asStoredRoom(writtenRoom()) });
    });

    expect(window.location.pathname).toBe(roomPath('room-1'));
    expect(screen.getByLabelText(/room link/i)).toHaveValue(
      roomUrl('room-1', window.location.origin),
    );
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Vik');
    expect(screen.getByRole('group', { name: /crossword grid/i })).toBeInTheDocument();
  });

  it('is not taken back to the word list by the Back button', async () => {
    createRoom();
    await waitFor(() => expect(onSnapshot).toHaveBeenCalled());

    act(() => {
      window.history.back();
    });

    // `/create` was replaced rather than pushed: going back to a filled-in form
    // invites creating a second room, one the guests were never sent to.
    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });
});
