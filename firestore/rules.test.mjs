import { readFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';

/**
 * Behaviour tests for `firestore.rules`, run against the Firestore emulator.
 *
 * Not part of `pnpm test`: they need a running emulator (and a JVM). Run them
 * with `pnpm test:rules`, which starts the emulator, runs this file and shuts
 * the emulator down again. CI runs the same command in its `Rules` job.
 *
 * They exist because these rules are the only access control the project has —
 * clients write to Firestore directly, with no backend of ours in between.
 */

const PROJECT_ID = 'demo-word-crossword';
const OWNER = 'owner-uid';
const OTHER_PLAYER = 'player-uid';
const ROOM_PATH = 'rooms/room-1';

const HOUR_MS = 60 * 60 * 1000;

const hoursFromNow = (hours) => Timestamp.fromMillis(Date.now() + hours * HOUR_MS);

/** A room document exactly as `buildRoomDocument` produces it. */
const roomOwnedBy = (ownerId, overrides = {}) => ({
  status: 'lobby',
  ownerId,
  layout: {
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
  },
  words: { w0: { hiddenFromPlayerId: null, guessedByPlayerId: null } },
  players: { [ownerId]: { nickname: 'Vik', joinedAt: Timestamp.now() } },
  createdAt: Timestamp.now(),
  expiresAt: hoursFromNow(24),
  ...overrides,
});

let testEnv;

const asOwner = () => testEnv.authenticatedContext(OWNER).firestore();
const asOtherPlayer = () => testEnv.authenticatedContext(OTHER_PLAYER).firestore();
const asStranger = () => testEnv.unauthenticatedContext().firestore();

/** Puts an existing room in place, bypassing the rules under test. */
const seedRoom = () =>
  testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), ROOM_PATH), roomOwnedBy(OWNER));
  });

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

after(async () => {
  await testEnv.cleanup();
});

describe('creating a room', () => {
  it('is allowed for a signed-in owner writing a well-formed room', async () => {
    await testEnv.clearFirestore();

    await assertSucceeds(setDoc(doc(asOwner(), ROOM_PATH), roomOwnedBy(OWNER)));
  });

  it('accepts the plain JavaScript dates the client actually writes', async () => {
    await testEnv.clearFirestore();
    // `buildRoomDocument` hands the SDK `Date`s and lets it convert them, so
    // the `is timestamp` checks in the rules must hold for those too.
    const room = roomOwnedBy(OWNER, {
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * HOUR_MS),
      players: { [OWNER]: { nickname: 'Vik', joinedAt: new Date() } },
    });

    await assertSucceeds(setDoc(doc(asOwner(), ROOM_PATH), room));
  });

  it('is refused to anyone not signed in', async () => {
    await testEnv.clearFirestore();

    await assertFails(setDoc(doc(asStranger(), ROOM_PATH), roomOwnedBy(OWNER)));
  });

  it('is refused when the room claims a different owner', async () => {
    await testEnv.clearFirestore();

    await assertFails(setDoc(doc(asOwner(), ROOM_PATH), roomOwnedBy(OTHER_PLAYER)));
  });

  it('is refused when someone else is put in the room upfront', async () => {
    await testEnv.clearFirestore();
    const room = roomOwnedBy(OWNER, {
      players: {
        [OWNER]: { nickname: 'Vik', joinedAt: Timestamp.now() },
        [OTHER_PLAYER]: { nickname: 'Bob', joinedAt: Timestamp.now() },
      },
    });

    await assertFails(setDoc(doc(asOwner(), ROOM_PATH), room));
  });

  it('is refused when the room would be born already expired', async () => {
    await testEnv.clearFirestore();

    await assertFails(
      setDoc(doc(asOwner(), ROOM_PATH), roomOwnedBy(OWNER, { expiresAt: hoursFromNow(-1) })),
    );
  });

  it('is refused when the room would outlive its 24 hours', async () => {
    await testEnv.clearFirestore();

    await assertFails(
      setDoc(doc(asOwner(), ROOM_PATH), roomOwnedBy(OWNER, { expiresAt: hoursFromNow(24 * 30) })),
    );
  });

  it('is refused when no word was placed in the grid', async () => {
    await testEnv.clearFirestore();
    const room = roomOwnedBy(OWNER, {
      layout: { rows: 0, cols: 0, cells: [], placedWords: [], unplacedWords: ['abc'] },
      words: {},
    });

    await assertFails(setDoc(doc(asOwner(), ROOM_PATH), room));
  });

  it('is refused when word states and placed words disagree', async () => {
    await testEnv.clearFirestore();

    await assertFails(setDoc(doc(asOwner(), ROOM_PATH), roomOwnedBy(OWNER, { words: {} })));
  });

  it('is refused when the document carries a field the schema does not know', async () => {
    await testEnv.clearFirestore();

    await assertFails(setDoc(doc(asOwner(), ROOM_PATH), roomOwnedBy(OWNER, { isAdmin: true })));
  });

  it('is refused when the room starts anywhere but in the lobby', async () => {
    await testEnv.clearFirestore();

    await assertFails(
      setDoc(doc(asOwner(), ROOM_PATH), roomOwnedBy(OWNER, { status: 'completed' })),
    );
  });
});

describe('reading a room', () => {
  it('is allowed for any signed-in player who has the link', async () => {
    await testEnv.clearFirestore();
    await seedRoom();

    await assertSucceeds(getDoc(doc(asOtherPlayer(), ROOM_PATH)));
  });

  it('is refused to anyone not signed in', async () => {
    await testEnv.clearFirestore();
    await seedRoom();

    await assertFails(getDoc(doc(asStranger(), ROOM_PATH)));
  });

  it('never lets anyone walk the collection to discover rooms', async () => {
    await testEnv.clearFirestore();
    await seedRoom();

    await assertFails(getDocs(collection(asOwner(), 'rooms')));
  });
});

describe('playing in a room', () => {
  it('lets a player join by adding themselves to the room', async () => {
    await testEnv.clearFirestore();
    await seedRoom();

    await assertSucceeds(
      updateDoc(doc(asOtherPlayer(), ROOM_PATH), {
        [`players.${OTHER_PLAYER}`]: { nickname: 'Bob', joinedAt: Timestamp.now() },
      }),
    );
  });

  it('refuses a player joining a room whose lifetime has run out', async () => {
    // Firestore's TTL policy deletes lazily, so an expired room is still there
    // to be opened. The rules are what keep a game from resuming inside it —
    // the room screen checks the same expiry so a player is told why.
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), ROOM_PATH),
        roomOwnedBy(OWNER, { expiresAt: hoursFromNow(-1) }),
      );
    });

    await assertFails(
      updateDoc(doc(asOtherPlayer(), ROOM_PATH), {
        [`players.${OTHER_PLAYER}`]: { nickname: 'Bob', joinedAt: Timestamp.now() },
      }),
    );
  });

  it('accepts the plain JavaScript date a joining player actually writes', async () => {
    await testEnv.clearFirestore();
    await seedRoom();

    await assertSucceeds(
      updateDoc(doc(asOtherPlayer(), ROOM_PATH), {
        [`players.${OTHER_PLAYER}`]: { nickname: 'Bob', joinedAt: new Date() },
      }),
    );
  });

  it('lets a guessed word be recorded', async () => {
    await testEnv.clearFirestore();
    await seedRoom();

    await assertSucceeds(
      updateDoc(doc(asOtherPlayer(), ROOM_PATH), {
        'words.w0.guessedByPlayerId': OTHER_PLAYER,
        status: 'completed',
      }),
    );
  });

  it('keeps the room alive by pushing its expiry forward', async () => {
    await testEnv.clearFirestore();
    await seedRoom();

    await assertSucceeds(
      updateDoc(doc(asOtherPlayer(), ROOM_PATH), { expiresAt: hoursFromNow(24) }),
    );
  });

  it('refuses a status the game does not know', async () => {
    await testEnv.clearFirestore();
    await seedRoom();

    await assertFails(updateDoc(doc(asOtherPlayer(), ROOM_PATH), { status: 'everyone-wins' }));
  });

  it('refuses to reopen a game that is already finished', async () => {
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), ROOM_PATH),
        roomOwnedBy(OWNER, { status: 'completed' }),
      );
    });

    await assertFails(updateDoc(doc(asOtherPlayer(), ROOM_PATH), { status: 'playing' }));
  });

  it('refuses a fifth player', async () => {
    await testEnv.clearFirestore();
    await seedRoom();
    const crowd = Object.fromEntries(
      ['a', 'b', 'c', 'd', 'e'].map((id) => [id, { nickname: id, joinedAt: Timestamp.now() }]),
    );

    await assertFails(updateDoc(doc(asOtherPlayer(), ROOM_PATH), { players: crowd }));
  });

  it('refuses to let the crossword be rewritten mid-game', async () => {
    await testEnv.clearFirestore();
    await seedRoom();

    await assertFails(
      updateDoc(doc(asOtherPlayer(), ROOM_PATH), {
        'layout.placedWords': [{ word: 'dog', orientation: 'across', cells: [{ row: 0, col: 0 }] }],
      }),
    );
  });

  it('refuses to let the room change hands', async () => {
    await testEnv.clearFirestore();
    await seedRoom();

    await assertFails(updateDoc(doc(asOtherPlayer(), ROOM_PATH), { ownerId: OTHER_PLAYER }));
  });

  it('refuses to let words be added to or removed from the game', async () => {
    await testEnv.clearFirestore();
    await seedRoom();

    await assertFails(
      updateDoc(doc(asOtherPlayer(), ROOM_PATH), {
        'words.w1': { hiddenFromPlayerId: null, guessedByPlayerId: null },
      }),
    );
  });

  it('refuses to let anyone delete the room — only the TTL policy may', async () => {
    await testEnv.clearFirestore();
    await seedRoom();

    await assertFails(deleteDoc(doc(asOwner(), ROOM_PATH)));
  });
});

describe('anything outside the rooms collection', () => {
  it('is unreachable from a browser', async () => {
    await testEnv.clearFirestore();

    await assertFails(setDoc(doc(asOwner(), 'anything/else'), { hello: 'world' }));
    await assertFails(getDoc(doc(asOwner(), 'anything/else')));
  });
});
