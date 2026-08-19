import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { signInAnonymously } from 'firebase/auth';
import { onSnapshot, updateDoc } from 'firebase/firestore';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoomPage } from './pages/RoomPage';
import { AWAY_AFTER_MS, SEAT_FREE_AFTER_MS } from './rooms/presence';
import { ROOM_ROUTE_PATTERN, roomPath } from './rooms/room-link';

/**
 * The whole of issue #47, walked from one end to the other: a room fills up
 * with a tab nobody can reach, and the friend the link was sent to gets in
 * anyway.
 *
 * Kept apart from the page tests because no single screen can see it. What
 * happens here happens between three browsers — the one that went quiet, the
 * one watching it go quiet, and the one arriving afterwards — and the only
 * thing they share is the room document and the clock. Each of them is rendered
 * in turn, reading the room as it stands at that moment.
 *
 * Nothing here waits for real time to pass: the clock is moved by hand, and
 * every threshold is crossed on purpose.
 */

// Firebase is the system boundary: mocked so three browsers can be walked
// through one room without a project. Everything above it runs for real.
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
  // The SDK's word for "this field goes", which taking a seat writes.
  deleteField: vi.fn(() => ({ field: 'deleted' })),
}));
vi.mock('firebase/analytics', () => ({
  initializeAnalytics: vi.fn(() => ({ app: 'fake-analytics' })),
  isSupported: vi.fn(() => Promise.resolve(false)),
  logEvent: vi.fn(),
  setDefaultEventParameters: vi.fn(),
}));

const OWNER_ID = 'owner-uid';
/** The host's second device: a browser of its own, so a player of its own. */
const GHOST_ID = 'ghost-uid';
/** The friend the link was actually sent to. */
const FRIEND_ID = 'friend-uid';

const SECOND_MS = 1000;
const HOUR_MS = 60 * 60 * SECOND_MS;

const at = (millis: number) => ({ toMillis: () => millis });

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

/** The room as Firestore holds it, with each player's mark said outright. */
const roomWithMarks = (marks: Readonly<Record<string, number>>) => ({
  status: 'lobby',
  ownerId: OWNER_ID,
  layout: LAYOUT,
  words: { w0: { hiddenFromPlayerId: null, guessedByPlayerId: null } },
  players: Object.fromEntries(
    Object.entries(marks).map(([playerId, lastSeenAtMillis]) => [
      playerId,
      {
        nickname: playerId === OWNER_ID ? 'Vik' : playerId === GHOST_ID ? 'Vik (phone)' : 'Bob',
        joinedAt: at(playerId === OWNER_ID ? 0 : 1),
        lastSeenAt: at(lastSeenAtMillis),
      },
    ]),
  ),
  createdAt: at(0),
  expiresAt: at(Date.now() + HOUR_MS),
});

/** The snapshot callback Firestore would drive the current subscription with. */
let emitRoom: (snapshot: { exists: () => boolean; data: () => unknown }) => void;

/** Every write made so far that was not a client marking itself present. */
const gameWrites = (): Record<string, unknown>[] =>
  vi
    .mocked(updateDoc)
    .mock.calls.map(([, update]) => update as unknown as Record<string, unknown>)
    .filter((update) =>
      Object.keys(update).some((field) => field !== 'expiresAt' && !field.endsWith('.lastSeenAt')),
    );

/** Opens the room in a browser signed in as this player, and lets it read the room. */
const openRoomAs = async (playerId: string, room: unknown) => {
  vi.mocked(signInAnonymously).mockResolvedValue({ user: { uid: playerId } } as never);

  render(
    <MemoryRouter initialEntries={[roomPath('room-1')]}>
      <Routes>
        <Route path={ROOM_ROUTE_PATTERN} element={<RoomPage />} />
      </Routes>
    </MemoryRouter>,
  );

  // Signing in resolves, the subscription is made, and the room arrives — no
  // waiting involved, since every promise here is already settled.
  await act(async () => undefined);
  await act(async () => {
    emitRoom({ exists: () => true, data: () => room });
  });
};

/**
 * Moves the clock on, and hands the screen the room as it stands afterwards.
 *
 * The room is built after the clock has moved, not before: the marks in it are
 * the point, and one written a minute early would be a minute stale.
 */
const passTime = async (millis: number, roomNow: () => unknown) => {
  await act(() => vi.advanceTimersByTimeAsync(millis));
  await act(async () => {
    emitRoom({ exists: () => true, data: roomNow });
  });
};

/**
 * The row of the player list belonging to this nickname.
 *
 * Matched on the name exactly, since one of the players here is called
 * `Vik (phone)` and the other `Vik` — which is the whole point of the story.
 */
const rowOf = (nickname: string): HTMLElement => {
  const row = screen
    .getAllByRole('listitem')
    .find((item) => within(item).queryByText(nickname) !== null);

  if (row === undefined) {
    throw new Error(`Nobody called ${nickname} is in the room.`);
  }

  return row;
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(updateDoc).mockResolvedValue(undefined);
  vi.mocked(onSnapshot).mockImplementation(((_reference: unknown, onNext: typeof emitRoom) => {
    emitRoom = onNext;

    return vi.fn();
  }) as never);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('a room with a tab in it that nobody can reach', () => {
  it('shows the host their own ghost going quiet, then gives its seat to their friend', async () => {
    const start = Date.now();

    // The host has opened the link on their phone as well, so the room is full
    // and the friend it was sent to is standing outside it.
    await openRoomAs(OWNER_ID, roomWithMarks({ [OWNER_ID]: start, [GHOST_ID]: start }));

    expect(rowOf('Vik (phone)')).toBeInTheDocument();
    expect(screen.queryByText(/away for/i)).not.toBeInTheDocument();

    // The phone's tab is closed with the messenger it lived in. Its mark stops
    // moving; the host's own keeps being written.
    await passTime(AWAY_AFTER_MS + 5 * SECOND_MS, () =>
      roomWithMarks({ [OWNER_ID]: Date.now(), [GHOST_ID]: start }),
    );

    expect(rowOf('Vik (phone)')).toHaveTextContent(/away for under a minute/i);
    expect(rowOf('Vik')).not.toHaveTextContent(/away for/i);
    // The host is being heard perfectly well, and is told nothing.
    expect(screen.queryByText(/has not heard from you/i)).not.toBeInTheDocument();

    // Long enough that the seat is nobody's — but nothing about the host's own
    // screen changes, because a player already in a room removes nobody.
    await passTime(SEAT_FREE_AFTER_MS - AWAY_AFTER_MS, () =>
      roomWithMarks({ [OWNER_ID]: Date.now(), [GHOST_ID]: start }),
    );

    expect(rowOf('Vik (phone)')).toHaveTextContent(/away for 1 min/i);
    expect(gameWrites()).toEqual([]);

    // The friend opens the link at last, in a browser of their own.
    const roomWithAGhost = roomWithMarks({ [OWNER_ID]: Date.now(), [GHOST_ID]: start });

    cleanup();
    await openRoomAs(FRIEND_ID, roomWithAGhost);

    expect(screen.getByLabelText(/nickname/i)).toBeInTheDocument();
    expect(screen.queryByText(/played by exactly two people/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/nickname/i), { target: { value: 'Bob' } });
    fireEvent.click(screen.getByRole('button', { name: /join the game/i }));
    await act(async () => undefined);

    // One write: the seat is taken and filled together, so the room is never a
    // size the security rules refuse.
    expect(gameWrites()).toHaveLength(1);
    expect(Object.keys(gameWrites()[0] ?? {})).toEqual([
      `players.${FRIEND_ID}`,
      `players.${GHOST_ID}`,
      'expiresAt',
    ]);

    // The ghost wakes up — the phone is opened again — and finds the room got
    // on without it. It meets the notice anybody outside a full room meets, and
    // writes nothing at all: a tab that quietly put itself back would push out
    // the very player it had just made room for.
    cleanup();
    vi.mocked(updateDoc).mockClear();
    await openRoomAs(GHOST_ID, roomWithMarks({ [OWNER_ID]: Date.now(), [FRIEND_ID]: Date.now() }));

    expect(screen.getByText(/played by exactly two people/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('lands a player who comes back in time straight in the room, with nothing to type', async () => {
    // Reconnecting (issue #9) is untouched: the seat is still theirs, so the
    // room takes them back without a nickname and without a write to say so.
    const start = Date.now();
    const room = roomWithMarks({ [OWNER_ID]: start, [GHOST_ID]: start });

    await openRoomAs(OWNER_ID, room);

    cleanup();
    await act(() => vi.advanceTimersByTimeAsync(SEAT_FREE_AFTER_MS - 10 * SECOND_MS));
    await openRoomAs(OWNER_ID, room);

    expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();
    expect(rowOf('Vik')).toHaveTextContent(/host/i);
    expect(gameWrites()).toEqual([]);
  });

  it('tells a player nobody can hear that it is them, not the room', async () => {
    // Firestore serves this client its own writes from cache, so the screen
    // looks alive to the one person the room has stopped hearing from.
    const start = Date.now();

    await openRoomAs(OWNER_ID, roomWithMarks({ [OWNER_ID]: start, [GHOST_ID]: start }));

    // Nothing more arrives, because nothing this browser writes is arriving
    // anywhere. The only thing that moves is the clock.
    await act(() => vi.advanceTimersByTimeAsync(2 * AWAY_AFTER_MS));

    expect(screen.getByText(/the room has not heard from you for 1 min/i)).toBeInTheDocument();
  });
});
