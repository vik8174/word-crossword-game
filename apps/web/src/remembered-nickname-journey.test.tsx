import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { signInAnonymously } from 'firebase/auth';
import { addDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateRoomPage } from './pages/CreateRoomPage';
import { RoomPage } from './pages/RoomPage';
import { MAX_NICKNAME_LENGTH } from './rooms/nickname';
import { ROOM_ROUTE_PATTERN, roomPath } from './rooms/room-link';

/**
 * Issue #75 from both ends: the name a player gives is asked for in two places,
 * and one browser remembers it across the two.
 *
 * Kept apart from the page tests because neither screen can see it. The host
 * types their name on `/create` and the guest types theirs behind an invite
 * link, so a memory that only one of them writes to and only the other reads
 * from would pass every test either screen can hold — while a host, who is the
 * likeliest person in this game to make a second room, would be the one player
 * whose name is never offered back.
 */

// Firebase is the system boundary: mocked so a browser can be walked from
// creating a room to standing at somebody else's door without a project.
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ name: 'auth' })),
  signInAnonymously: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ name: 'firestore' })),
  collection: vi.fn(() => ({ path: 'rooms' })),
  addDoc: vi.fn(),
  doc: vi.fn(() => ({ path: 'rooms/room-2' })),
  onSnapshot: vi.fn(),
  updateDoc: vi.fn(),
  deleteField: vi.fn(() => ({ field: 'deleted' })),
}));
vi.mock('firebase/analytics', () => ({
  initializeAnalytics: vi.fn(() => ({ app: 'fake-analytics' })),
  isSupported: vi.fn(() => Promise.resolve(false)),
  logEvent: vi.fn(),
  setDefaultEventParameters: vi.fn(),
}));

/** This browser, in every scene: one anonymous identity, two rooms. */
const VISITOR_ID = 'vik-uid';

/** Whoever's link this browser is opening — the room it is not a player of. */
const HOST_ID = 'ann-uid';

const HOUR_MS = 60 * 60 * 1000;

const TEN_WORDS = 'apple, bread, cheese, dinner, engine, flower, garden, hunter, island, jacket';

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

/** Somebody else's lobby, with the one free seat this browser is offered. */
const SOMEBODY_ELSES_ROOM = {
  status: 'lobby',
  ownerId: HOST_ID,
  layout: LAYOUT,
  words: { w0: { hiddenFromPlayerId: null, guessedByPlayerId: null } },
  players: { [HOST_ID]: { nickname: 'Ann', joinedAt: at(0), lastSeenAt: at(Date.now()) } },
  createdAt: at(0),
  expiresAt: at(Date.now() + HOUR_MS),
};

/** The snapshot callback Firestore would drive the current subscription with. */
let emitRoom: (snapshot: { exists: () => boolean; data: () => unknown }) => void;

const nicknameField = () => screen.getByLabelText(/nickname/i);

const typeInto = (label: RegExp, value: string) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

const renderAppAt = (entry: string) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/create" element={<CreateRoomPage />} />
        <Route path={ROOM_ROUTE_PATTERN} element={<RoomPage />} />
      </Routes>
    </MemoryRouter>,
  );

/** Opens `/create`, as a host starting a game does. */
const openCreateScreen = () => renderAppAt('/create');

/** Opens the invite link of a room this browser is not a player of. */
const openSomebodyElsesLink = async () => {
  renderAppAt(roomPath('room-2'));

  // Signing in resolves, the subscription is made, and the room arrives — no
  // waiting involved, since every promise here is already settled.
  await act(async () => undefined);
  await act(async () => {
    emitRoom({ exists: () => true, data: () => SOMEBODY_ELSES_ROOM });
  });
};

/** Makes a room under this name and leaves the screen it ended on. */
const createRoomAs = async (nickname: string) => {
  openCreateScreen();
  typeInto(/nickname/i, nickname);
  typeInto(/words/i, TEN_WORDS);
  fireEvent.click(screen.getByRole('button', { name: /create room/i }));

  // The room was written and this browser is inside it, which is where the
  // creation screen ends: `/create` has nothing more to say.
  await screen.findByText(/connecting to the game/i);
  await act(async () => undefined);
  cleanup();
};

/** Fills in the nickname form behind an invite link and presses the button. */
const joinAs = async (nickname: string) => {
  typeInto(/nickname/i, nickname);
  fireEvent.click(screen.getByRole('button', { name: /join the game/i }));
  await act(async () => undefined);
};

beforeEach(() => {
  window.localStorage.clear();
  vi.mocked(signInAnonymously).mockResolvedValue({ user: { uid: VISITOR_ID } } as never);
  vi.mocked(addDoc).mockResolvedValue({ id: 'room-1' } as never);
  vi.mocked(updateDoc).mockResolvedValue(undefined);
  vi.mocked(onSnapshot).mockImplementation(((_reference: unknown, onNext: typeof emitRoom) => {
    emitRoom = onNext;

    return () => undefined;
  }) as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('a name given once', () => {
  it('is offered back at somebody else’s door to the host who made a room', async () => {
    await createRoomAs('Vik');

    await openSomebodyElsesLink();

    expect(nicknameField()).toHaveValue('Vik');
  });

  it('is offered back on the creation screen to the guest who joined a room', async () => {
    await openSomebodyElsesLink();
    await joinAs('Bob');
    cleanup();

    openCreateScreen();

    expect(nicknameField()).toHaveValue('Bob');
  });

  it('gives way to the name the player rewrote it to', async () => {
    await createRoomAs('Vik');
    await openSomebodyElsesLink();

    await joinAs('Viktor');
    cleanup();
    openCreateScreen();

    expect(nicknameField()).toHaveValue('Viktor');
  });
});

describe('a game that was never joined', () => {
  it('leaves nothing behind for the next screen to offer', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(updateDoc).mockRejectedValue(new Error('The network is gone.'));
    await openSomebodyElsesLink();

    await joinAs('Bob');

    expect(await screen.findByText(/could not join the game/i)).toBeInTheDocument();
    cleanup();
    openCreateScreen();
    expect(nicknameField()).toHaveValue('');
  });
});

describe('a stored name the nickname rules would refuse', () => {
  it('is not offered, and leaves the button as locked as an empty field does', async () => {
    window.localStorage.setItem(
      'word-crossword-game:nickname',
      'x'.repeat(MAX_NICKNAME_LENGTH + 1),
    );

    await openSomebodyElsesLink();

    expect(nicknameField()).toHaveValue('');
    expect(screen.getByRole('button', { name: /join the game/i })).toBeDisabled();
  });
});

describe('a browser with nowhere to keep a name', () => {
  it('is asked for one on an unbroken screen, and says so once', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });

    await openSomebodyElsesLink();

    expect(nicknameField()).toHaveValue('');
    expect(screen.getByRole('button', { name: /join the game/i })).toBeInTheDocument();
    // Proof the storage really was unreachable, rather than merely empty.
    expect(warn).toHaveBeenCalled();
  });
});
