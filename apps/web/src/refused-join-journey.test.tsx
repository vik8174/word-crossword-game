import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FirebaseError } from 'firebase/app';
import { signInAnonymously } from 'firebase/auth';
import { onSnapshot, updateDoc } from 'firebase/firestore';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoomPage } from './pages/RoomPage';
import { SEAT_FREE_AFTER_MS } from './rooms/presence';
import { ROOM_ROUTE_PATTERN, roomPath } from './rooms/room-link';

/**
 * The whole of issue #50, walked from one end to the other: one free seat, two
 * guests who both saw it, and the one who was a moment slower.
 *
 * Kept apart from the page tests because no single screen can see it. `joinRoom`
 * writes without re-reading the room by decision, so the security rules are the
 * only thing between the two of them and a third seat — which means the loser
 * finds out from a refused write and from nothing else. What the refusal says
 * about the world, and what the room says a moment later, are two different
 * facts arriving at one screen, and that order is the story.
 *
 * Both guests are handed the very same snapshot on purpose. That is not a
 * contrived race: a lobby seat frees itself once its mark is 60 seconds old
 * (issue #47), so two people opening the link within the same minute read the
 * same free seat as a matter of course.
 */

// Firebase is the system boundary: mocked so two browsers can be walked through
// one room without a project. `firebase/app` is deliberately left real — the
// error class the app tells a refusal by is the SDK's own.
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
/** The host's other tab, which stopped marking itself present long ago. */
const GHOST_ID = 'ghost-uid';
/** The two people the link was passed on to, each in a browser of their own. */
const WINNER_ID = 'ann-uid';
const LOSER_ID = 'bob-uid';

const HOUR_MS = 60 * 60 * 1000;

/** What Firestore answers a write its rules turned down, and all it answers. */
const REFUSED_BY_RULES = new FirebaseError(
  'permission-denied',
  'Missing or insufficient permissions.',
);

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

const NICKNAMES: Readonly<Record<string, string>> = {
  [OWNER_ID]: 'Vik',
  [GHOST_ID]: 'Vik (phone)',
  [WINNER_ID]: 'Ann',
  [LOSER_ID]: 'Bob',
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
        nickname: NICKNAMES[playerId],
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

/** Fills in the nickname form and presses the button, as a guest would. */
const joinAs = async (nickname: string) => {
  fireEvent.change(screen.getByLabelText(/nickname/i), { target: { value: nickname } });
  fireEvent.click(screen.getByRole('button', { name: /join the game/i }));
  await act(async () => undefined);
};

beforeEach(() => {
  // A nickname a game was played under is remembered in this profile's own
  // storage (issue #75), which jsdom keeps for the whole file: emptied here so
  // no test is handed a form the one before it filled in.
  window.localStorage.clear();
  vi.mocked(updateDoc).mockResolvedValue(undefined);
  vi.mocked(onSnapshot).mockImplementation(((_reference: unknown, onNext: typeof emitRoom) => {
    emitRoom = onNext;

    return vi.fn();
  }) as never);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('two guests reaching for the same free seat', () => {
  /** The room both of them read: full, but with a seat its owner's phone gave up. */
  const roomWithAGhost = () =>
    roomWithMarks({ [OWNER_ID]: Date.now(), [GHOST_ID]: Date.now() - 2 * SEAT_FREE_AFTER_MS });

  it('lets one in, and tells the other about the room rather than about their connection', async () => {
    const oneFreeSeat = roomWithAGhost();

    // Ann opens the link and is offered the seat the phone stopped sitting in.
    await openRoomAs(WINNER_ID, oneFreeSeat);
    expect(screen.getByLabelText(/nickname/i)).toBeInTheDocument();

    await joinAs('Ann');
    expect(gameWrites()).toHaveLength(1);

    // Bob opens the very same room a moment later — his browser read the
    // snapshot before Ann's write, so he is offered the same seat.
    cleanup();
    vi.mocked(updateDoc).mockClear();
    await openRoomAs(LOSER_ID, oneFreeSeat);
    expect(screen.getByLabelText(/nickname/i)).toBeInTheDocument();

    // The rules refuse his write: the seat is Ann's and the room holds two.
    const reported = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(updateDoc).mockRejectedValue(REFUSED_BY_RULES);

    await joinAs('Bob');

    // Not a word about a connection that was working perfectly, and no button
    // to press again — the way on is a room of his own.
    expect(screen.queryByText(/check your connection/i)).not.toBeInTheDocument();
    expect(screen.getByText(/would not take you in/i)).toBeInTheDocument();
    // Waited for rather than read: the form is on its way out under the notice
    // for as long as the shift between the two screens lasts (issue #93).
    await waitFor(() => {
      expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /start a new game/i })).toBeInTheDocument();
    // Whoever is debugging still gets the whole of it.
    expect(reported).toHaveBeenCalledWith('Joining the room failed', REFUSED_BY_RULES);

    // And then the room arrives and says it better than the refusal could:
    // Bob's browser never stopped following it.
    await act(async () => {
      emitRoom({
        exists: () => true,
        data: () => roomWithMarks({ [OWNER_ID]: Date.now(), [WINNER_ID]: Date.now() }),
      });
    });

    expect(screen.getByText(/played by exactly two people/i)).toBeInTheDocument();
    expect(screen.queryByText(/would not take you in/i)).not.toBeInTheDocument();
    // One refused attempt, and nothing written since: the loser stopped asking.
    expect(gameWrites()).toHaveLength(1);
  });

  it('leaves a guest whose connection dropped exactly where they were, with a retry', async () => {
    await openRoomAs(LOSER_ID, roomWithAGhost());

    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(updateDoc).mockRejectedValue(
      new FirebaseError('unavailable', 'Failed to get document because the client is offline.'),
    );

    await joinAs('Bob');

    // Nothing happened to the room, so nothing is said about it — the seat is
    // still there and the button still works.
    expect(screen.getByText(/could not join the game/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nickname/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join the game/i })).toBeEnabled();
    expect(screen.queryByText(/would not take you in/i)).not.toBeInTheDocument();
  });
});
