import { act, renderHook } from '@testing-library/react';
import { updateDoc } from 'firebase/firestore';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PRESENCE_PERIOD_MS } from './presence';
import type { RoomDocument } from './room-document';
import { usePresenceHeartbeat } from './use-presence-heartbeat';
import type { RoomConnection } from './use-room-connection';

// Firestore is the boundary this hook writes through: mocked so the timer can
// be driven by hand without a project. The clock is the point of the file, so
// nothing here ever waits for real time to pass.
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

const timestamp = (millis: number) => ({ toMillis: () => millis });

const roomWith = (status: RoomDocument['status'], playerIds: readonly string[]): RoomDocument =>
  ({
    status,
    ownerId: 'owner-uid',
    layout: { rows: 1, cols: 1, cells: [], placedWords: [], unplacedWords: [] },
    words: {},
    players: Object.fromEntries(
      playerIds.map((id) => [id, { nickname: id, joinedAt: timestamp(0) }]),
    ),
    createdAt: timestamp(0),
    expiresAt: timestamp(Date.now() + 60_000),
  }) as unknown as RoomDocument;

/** A connection to a room this player is in, waiting in its lobby. */
const inTheRoom: RoomConnection = {
  status: 'ready',
  playerId: 'guest-uid',
  room: roomWith('lobby', ['owner-uid', 'guest-uid']),
};

const beat = (connection: RoomConnection = inTheRoom) =>
  renderHook((current: RoomConnection) => usePresenceHeartbeat('room-1', current), {
    initialProps: connection,
  });

/** Every mark written so far, as the field paths each write carried. */
const marks = () =>
  vi
    .mocked(updateDoc)
    .mock.calls.map(([, update]) => Object.keys(update as unknown as Record<string, unknown>));

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(updateDoc).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('usePresenceHeartbeat', () => {
  it('marks the player present as soon as the screen has the room', () => {
    // Not after the first period: a player coming back to a room they are still
    // listed in arrives with a mark minutes old, and their seat could be taken
    // while a timer counted down.
    beat();

    expect(marks()).toEqual([['players.guest-uid.lastSeenAt', 'expiresAt']]);
  });

  it('marks them again on every period, for as long as the screen is there', async () => {
    beat();

    await act(() => vi.advanceTimersByTimeAsync(PRESENCE_PERIOD_MS));
    expect(marks()).toHaveLength(2);

    await act(() => vi.advanceTimersByTimeAsync(2 * PRESENCE_PERIOD_MS));
    expect(marks()).toHaveLength(4);
  });

  it('marks nothing for a visitor who has not joined the room', async () => {
    beat({ status: 'ready', playerId: 'stranger-uid', room: roomWith('lobby', ['owner-uid']) });

    await act(() => vi.advanceTimersByTimeAsync(3 * PRESENCE_PERIOD_MS));

    expect(marks()).toEqual([]);
  });

  it('marks nothing once the game is over', async () => {
    // Every write pushes the room's expiry another 24 hours out, so a tab left
    // on the final screen would keep the room alive for good.
    beat({
      status: 'ready',
      playerId: 'guest-uid',
      room: roomWith('completed', ['owner-uid', 'guest-uid']),
    });

    await act(() => vi.advanceTimersByTimeAsync(3 * PRESENCE_PERIOD_MS));

    expect(marks()).toEqual([]);
  });

  it('stops marking when the game ends under it', async () => {
    const { rerender } = beat();

    rerender({
      status: 'ready',
      playerId: 'guest-uid',
      room: roomWith('completed', ['owner-uid', 'guest-uid']),
    });
    await act(() => vi.advanceTimersByTimeAsync(3 * PRESENCE_PERIOD_MS));

    expect(marks()).toHaveLength(1);
  });

  it('keeps one timer as snapshots arrive, however many of them there are', async () => {
    // The room document is a new object on every snapshot, and this client's own
    // beat causes one. An effect watching it would tear its own timer down every
    // time it fired.
    const { rerender } = beat();

    for (let snapshot = 0; snapshot < 5; snapshot += 1) {
      rerender({
        status: 'ready',
        playerId: 'guest-uid',
        room: roomWith('lobby', ['owner-uid', 'guest-uid']),
      });
    }

    await act(() => vi.advanceTimersByTimeAsync(PRESENCE_PERIOD_MS));

    expect(marks()).toHaveLength(2);
  });

  it('gives up once a mark is refused, instead of failing every period', async () => {
    // Firestore keeps retrying a write it merely could not send, so a rejection
    // means the rules refused it — an expired room, which nothing undoes.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(updateDoc).mockRejectedValue(new Error('Missing or insufficient permissions.'));

    beat();
    await act(() => vi.advanceTimersByTimeAsync(5 * PRESENCE_PERIOD_MS));

    expect(marks()).toHaveLength(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringMatching(/present/i),
      expect.anything(),
    );
  });

  it('stops marking when the screen goes away', async () => {
    const { unmount } = beat();

    await act(() => vi.advanceTimersByTimeAsync(PRESENCE_PERIOD_MS / 2));
    unmount();
    await act(() => vi.advanceTimersByTimeAsync(5 * PRESENCE_PERIOD_MS));

    expect(marks()).toHaveLength(1);
  });

  it('writes nothing while the room is still being read', async () => {
    beat({ status: 'connecting' });

    await act(() => vi.advanceTimersByTimeAsync(3 * PRESENCE_PERIOD_MS));

    expect(marks()).toEqual([]);
  });
});
