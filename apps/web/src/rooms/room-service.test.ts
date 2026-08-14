import { signInAnonymously } from 'firebase/auth';
import { addDoc, collection } from 'firebase/firestore';
import type { CrosswordLayout } from 'shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROOMS_COLLECTION } from './room-document';
import { createRoom } from './room-service';

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

const create = () => createRoom({ layout: LAYOUT, ownerNickname: 'Vik' });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(signInAnonymously).mockResolvedValue({ user: { uid: 'owner-uid' } } as never);
  vi.mocked(collection).mockReturnValue(ROOMS_REFERENCE as never);
  vi.mocked(addDoc).mockResolvedValue({ id: 'room-1' } as never);
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
