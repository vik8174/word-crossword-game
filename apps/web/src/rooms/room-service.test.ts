import { signInAnonymously } from 'firebase/auth';
import { addDoc, collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import type { CrosswordLayout } from 'shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROOM_LIFETIME_MS, ROOMS_COLLECTION, type RoomDocument } from './room-document';
import {
  completeGame,
  createRoom,
  endGameEarly,
  joinRoom,
  markPresence,
  recordGuess,
  startGame,
  subscribeToRoom,
} from './room-service';

// Firestore and Auth are the system boundary this module wraps: mocked here so
// the wiring (sign in, then write, then hand back the id) can be asserted
// without a Firebase project. Everything below the boundary is Google's code.
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
  // The SDK's word for "this field goes", which taking a seat writes.
  deleteField: vi.fn(() => ({ field: 'deleted' })),
}));

const LAYOUT: CrosswordLayout = {
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

const ROOMS_REFERENCE = { path: ROOMS_COLLECTION };
const ROOM_REFERENCE = { path: `${ROOMS_COLLECTION}/room-1` };

const create = () => createRoom({ layout: LAYOUT, ownerNickname: 'Vik' });

/** A stored room, as `snapshot.data()` would hand it back. */
const storedRoom = () => ({
  status: 'lobby',
  ownerId: 'owner-uid',
  layout: LAYOUT,
  words: { w0: { hiddenFromPlayerId: null, guessedByPlayerId: null } },
  players: { 'owner-uid': { nickname: 'Vik', joinedAt: { toMillis: () => 1000 } } },
  createdAt: { toMillis: () => 1000 },
  expiresAt: { toMillis: () => 2000 },
});

/** Runs a subscription and hands back the snapshot callback Firestore would call. */
const subscribeAndCapture = (subscriber: {
  onRoom: (room: unknown) => void;
  onError: (error: unknown) => void;
}) => {
  subscribeToRoom('room-1', subscriber);

  const [, onNext, onError] = vi.mocked(onSnapshot).mock.calls[0] as unknown as [
    unknown,
    (snapshot: { exists: () => boolean; data: () => unknown }) => void,
    (error: unknown) => void,
  ];

  return { onNext, onError };
};

/** Every update Firestore was handed, in the order they were written. */
const writtenUpdates = (): Record<string, unknown>[] =>
  vi.mocked(updateDoc).mock.calls.map(([, update]) => update as unknown as Record<string, unknown>);

/** One of those updates, failing loudly rather than asserting against nothing. */
const writtenUpdate = (index = 0): Record<string, unknown> => {
  const update = writtenUpdates()[index];

  if (update === undefined) {
    throw new Error(`Firestore was handed no update number ${index}.`);
  }

  return update;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(signInAnonymously).mockResolvedValue({ user: { uid: 'owner-uid' } } as never);
  vi.mocked(collection).mockReturnValue(ROOMS_REFERENCE as never);
  vi.mocked(doc).mockReturnValue(ROOM_REFERENCE as never);
  vi.mocked(addDoc).mockResolvedValue({ id: 'room-1' } as never);
  vi.mocked(updateDoc).mockResolvedValue(undefined);
  vi.mocked(onSnapshot).mockReturnValue(vi.fn());
});

describe('createRoom', () => {
  it('returns the id the room is reachable by', async () => {
    await expect(create()).resolves.toBe('room-1');
  });

  it('signs the owner in anonymously', async () => {
    await create();

    expect(signInAnonymously).toHaveBeenCalledOnce();
  });

  it('writes nothing when the owner could not be signed in', async () => {
    vi.mocked(signInAnonymously).mockRejectedValue(new Error('Network request failed.'));

    await expect(create()).rejects.toThrow(/network/i);
    expect(addDoc).not.toHaveBeenCalled();
  });

  it('writes the room into the rooms collection', async () => {
    await create();

    expect(collection).toHaveBeenCalledWith(expect.anything(), ROOMS_COLLECTION);
    expect(addDoc).toHaveBeenCalledWith(ROOMS_REFERENCE, expect.anything());
  });

  it('records the signed-in user as the owner and first player', async () => {
    await create();

    expect(addDoc).toHaveBeenCalledWith(
      ROOMS_REFERENCE,
      expect.objectContaining({
        ownerId: 'owner-uid',
        players: { 'owner-uid': expect.objectContaining({ nickname: 'Vik' }) },
      }),
    );
  });

  it('lets a rejected write reach the caller instead of reporting a room that does not exist', async () => {
    vi.mocked(addDoc).mockRejectedValue(new Error('Missing or insufficient permissions.'));

    await expect(create()).rejects.toThrow(/permissions/i);
  });
});

describe('subscribeToRoom', () => {
  it('watches the room the link points at', () => {
    subscribeToRoom('room-1', { onRoom: vi.fn(), onError: vi.fn() });

    expect(doc).toHaveBeenCalledWith(expect.anything(), ROOMS_COLLECTION, 'room-1');
    expect(onSnapshot).toHaveBeenCalledWith(
      ROOM_REFERENCE,
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('hands back the way to stop watching', () => {
    const unsubscribe = vi.fn();
    vi.mocked(onSnapshot).mockReturnValue(unsubscribe);

    expect(subscribeToRoom('room-1', { onRoom: vi.fn(), onError: vi.fn() })).toBe(unsubscribe);
  });

  it('reports the room on every update', () => {
    const onRoom = vi.fn();
    const { onNext } = subscribeAndCapture({ onRoom, onError: vi.fn() });
    const room = storedRoom();

    onNext({ exists: () => true, data: () => room });

    expect(onRoom).toHaveBeenCalledWith(room);
  });

  it('reports no room when the link leads to one that was never there or is already gone', () => {
    const onRoom = vi.fn();
    const { onNext } = subscribeAndCapture({ onRoom, onError: vi.fn() });

    onNext({ exists: () => false, data: () => undefined });

    expect(onRoom).toHaveBeenCalledWith(null);
  });

  it('reports no room when the document is not one this app understands', () => {
    const onRoom = vi.fn();
    const { onNext } = subscribeAndCapture({ onRoom, onError: vi.fn() });

    onNext({ exists: () => true, data: () => ({ status: 'lobby' }) });

    expect(onRoom).toHaveBeenCalledWith(null);
  });

  it('reports a subscription that broke down', () => {
    const onError = vi.fn();
    const { onError: reportError } = subscribeAndCapture({ onRoom: vi.fn(), onError });
    const failure = new Error('Missing or insufficient permissions.');

    reportError(failure);

    expect(onError).toHaveBeenCalledWith(failure);
  });
});

describe('joinRoom', () => {
  it('adds only the joining player, leaving everyone else in place', async () => {
    await joinRoom({ roomId: 'room-1', playerId: 'guest-uid', nickname: 'Bob' });

    expect(doc).toHaveBeenCalledWith(expect.anything(), ROOMS_COLLECTION, 'room-1');
    expect(updateDoc).toHaveBeenCalledWith(
      ROOM_REFERENCE,
      expect.objectContaining({
        'players.guest-uid': {
          nickname: 'Bob',
          joinedAt: expect.any(Date),
          lastSeenAt: expect.any(Date),
        },
      }),
    );
  });

  it('takes the seat it was given, in the write that puts the player in', async () => {
    await joinRoom({
      roomId: 'room-1',
      playerId: 'guest-uid',
      nickname: 'Bob',
      seatToRelease: 'ghost-uid',
    });

    expect(Object.keys(writtenUpdate())).toEqual([
      'players.guest-uid',
      'players.ghost-uid',
      'expiresAt',
    ]);
  });

  it('takes nobody out of a room that had a seat free', async () => {
    await joinRoom({ roomId: 'room-1', playerId: 'guest-uid', nickname: 'Bob' });

    expect(Object.keys(writtenUpdate())).toEqual(['players.guest-uid', 'expiresAt']);
  });

  it('lets a refused join reach the caller instead of pretending the player is in', async () => {
    vi.mocked(updateDoc).mockRejectedValue(new Error('Missing or insufficient permissions.'));

    await expect(
      joinRoom({ roomId: 'room-1', playerId: 'guest-uid', nickname: 'Bob' }),
    ).rejects.toThrow(/permissions/i);
  });
});

describe('markPresence', () => {
  it('writes the mark alone, so nothing else about the player is touched', async () => {
    // The whole entry would carry `joinedAt` with it, and the player list is
    // ordered by that — a mark written every fifteen seconds would reshuffle
    // the list on every beat.
    await markPresence({ roomId: 'room-1', playerId: 'guest-uid' });

    const [fields] = Object.keys(writtenUpdate()).filter((field) => field !== 'expiresAt');

    expect(fields).toBe('players.guest-uid.lastSeenAt');
    expect(writtenUpdate()['players.guest-uid.lastSeenAt']).toBeInstanceOf(Date);
  });

  it('lets a refused mark reach the caller, so the timer behind it can stop', async () => {
    vi.mocked(updateDoc).mockRejectedValue(new Error('Missing or insufficient permissions.'));

    await expect(markPresence({ roomId: 'room-1', playerId: 'guest-uid' })).rejects.toThrow(
      /permissions/i,
    );
  });
});

/** A room of three words, as the owner's screen holds it when they press start. */
const roomToStart = (playerIds: readonly string[]): RoomDocument =>
  ({
    ...storedRoom(),
    layout: {
      ...LAYOUT,
      placedWords: ['cat', 'arc', 'tea'].map((word) => ({
        word,
        orientation: 'across',
        cells: [{ row: 0, col: 0 }],
      })),
    },
    words: Object.fromEntries(
      ['w0', 'w1', 'w2'].map((id) => [id, { hiddenFromPlayerId: null, guessedByPlayerId: null }]),
    ),
    players: Object.fromEntries(
      playerIds.map((id) => [id, { nickname: id, joinedAt: { toMillis: () => 1000 } }]),
    ),
  }) as unknown as RoomDocument;

const start = (playerIds: readonly string[]) =>
  startGame({ roomId: 'room-1', room: roomToStart(playerIds) });

/** The assignment the first `updateDoc` call wrote, word by word. */
const writtenAssignment = () =>
  ['w0', 'w1', 'w2'].map((id) => writtenUpdate()[`words.${id}.hiddenFromPlayerId`]);

describe('startGame', () => {
  it('opens the game for guessing', async () => {
    await start(['owner-uid', 'guest-uid']);

    expect(updateDoc).toHaveBeenCalledWith(
      ROOM_REFERENCE,
      expect.objectContaining({ status: 'playing' }),
    );
  });

  it('hides every word of the room from one of its players', async () => {
    await start(['owner-uid', 'guest-uid']);

    const assignment = writtenAssignment();

    expect(assignment).toHaveLength(3);
    assignment.forEach((playerId) => expect(['owner-uid', 'guest-uid']).toContain(playerId));
  });

  it('writes the whole deal at once, so every player reads the same one', async () => {
    await start(['owner-uid', 'guest-uid', 'third-uid']);

    expect(updateDoc).toHaveBeenCalledOnce();
  });

  it('refuses to start a game the owner would be sitting in alone', async () => {
    await expect(start(['owner-uid'])).rejects.toThrow(/2 players/i);
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('lets a refused write reach the caller instead of pretending the game began', async () => {
    vi.mocked(updateDoc).mockRejectedValue(new Error('Missing or insufficient permissions.'));

    await expect(start(['owner-uid', 'guest-uid'])).rejects.toThrow(/permissions/i);
  });
});

describe('recordGuess', () => {
  const record = () => recordGuess({ roomId: 'room-1', playerId: 'guest-uid', wordId: 'w2' });

  it('marks the one word as answered, in the room it was answered in', async () => {
    await record();

    expect(doc).toHaveBeenCalledWith(expect.anything(), ROOMS_COLLECTION, 'room-1');
    expect(updateDoc).toHaveBeenCalledExactlyOnceWith(
      ROOM_REFERENCE,
      expect.objectContaining({ 'words.w2.guessedByPlayerId': 'guest-uid' }),
    );
  });

  it('lets a refused write reach the caller instead of losing the answer quietly', async () => {
    vi.mocked(updateDoc).mockRejectedValue(new Error('Missing or insufficient permissions.'));

    await expect(record()).rejects.toThrow(/permissions/i);
  });
});

describe('completeGame', () => {
  it('closes the game by writing the one field that says so', async () => {
    await completeGame('room-1');

    expect(doc).toHaveBeenCalledWith(expect.anything(), ROOMS_COLLECTION, 'room-1');
    expect(updateDoc).toHaveBeenCalledExactlyOnceWith(
      ROOM_REFERENCE,
      expect.objectContaining({ status: 'completed' }),
    );
  });

  it('says the same thing about the game however many clients call it', async () => {
    // Every client that sees a full board closes the game, so the write has to
    // be one several of them can make at once without the room noticing. Their
    // expiries differ by the milliseconds between the calls, and the last one
    // to land wins by that much.
    await completeGame('room-1');
    await completeGame('room-1');

    const statuses = writtenUpdates().map((update) => update.status);

    expect(statuses).toEqual(['completed', 'completed']);
  });

  it('lets a refused write reach the caller instead of leaving the game half-closed', async () => {
    vi.mocked(updateDoc).mockRejectedValue(new Error('Missing or insufficient permissions.'));

    await expect(completeGame('room-1')).rejects.toThrow(/permissions/i);
  });
});

describe('endGameEarly', () => {
  it('ends the game by writing the status that says it was ended', async () => {
    // Not `completed`: this room's crossword was not, and the document is what
    // every screen afterwards reads the result off.
    await endGameEarly('room-1');

    expect(doc).toHaveBeenCalledWith(expect.anything(), ROOMS_COLLECTION, 'room-1');
    expect(updateDoc).toHaveBeenCalledExactlyOnceWith(
      ROOM_REFERENCE,
      expect.objectContaining({ status: 'closed' }),
    );
  });

  it('lets a refusal reach the caller, which is the one who has to be told', async () => {
    // Unlike the automatic ending, nothing retries this one on the next
    // snapshot: a person asked for it, and the screen they asked from is where
    // a refusal has to surface.
    vi.mocked(updateDoc).mockRejectedValue(new Error('Missing or insufficient permissions.'));

    await expect(endGameEarly('room-1')).rejects.toThrow(/permissions/i);
  });
});

describe('keeping a room alive', () => {
  // The security rules check `expiresAt` on every update, so a room whose
  // expiry stopped moving stops taking writes the moment its 24 hours run out —
  // a game played across a day would die in the middle of itself. Every write
  // this module makes is therefore also a write that postpones the room.
  const writes: readonly [string, () => Promise<void>][] = [
    [
      'a player joining',
      () => joinRoom({ roomId: 'room-1', playerId: 'guest-uid', nickname: 'Bob' }),
    ],
    ['the game starting', () => start(['owner-uid', 'guest-uid'])],
    [
      'a word being answered',
      () => recordGuess({ roomId: 'room-1', playerId: 'guest-uid', wordId: 'w2' }),
    ],
    ['the game being closed', () => completeGame('room-1')],
    ['the game being ended by a player', () => endGameEarly('room-1')],
    [
      'a player marking themselves present',
      () => markPresence({ roomId: 'room-1', playerId: 'guest-uid' }),
    ],
  ];

  it.each(writes)('pushes the expiry forward when %s', async (_description, write) => {
    const before = Date.now();

    await write();

    const expiresAt = writtenUpdate().expiresAt;

    expect(expiresAt).toBeInstanceOf(Date);
    expect((expiresAt as Date).getTime()).toBeGreaterThanOrEqual(before + ROOM_LIFETIME_MS);
  });
});
