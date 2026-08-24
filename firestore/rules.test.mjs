import { readFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
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
/** One player more than a room takes — the guest these rules have to turn away. */
const THIRD_PLAYER = 'third-uid';
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
const asThirdPlayer = () => testEnv.authenticatedContext(THIRD_PLAYER).firestore();
const asStranger = () => testEnv.unauthenticatedContext().firestore();

/** Puts an existing room in place, bypassing the rules under test. */
const seedRoom = (overrides = {}) =>
  testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), ROOM_PATH), roomOwnedBy(OWNER, overrides));
  });

/** Both players in the room, as they are once someone has joined by the link. */
const twoPlayers = {
  [OWNER]: { nickname: 'Vik', joinedAt: Timestamp.now() },
  [OTHER_PLAYER]: { nickname: 'Bob', joinedAt: Timestamp.now() },
};

/** What starting a game writes: the deal, and the room opening for guesses. */
const startGameUpdate = () => ({
  status: 'playing',
  'words.w0.hiddenFromPlayerId': OTHER_PLAYER,
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

  it('lets any player close a game on its own, without an answer alongside it', async () => {
    // This is the write the win condition actually makes: the game is closed
    // from the room as it arrived, so the client that closes it is rarely the
    // one that sent the last answer, and several of them may do it at once
    // (docs/decisions/0012-ending-a-game-from-the-received-state.md). The rules
    // cannot walk the `words` map to check the grid is really full, and they
    // are not asked to.
    await testEnv.clearFirestore();
    await seedRoom({ status: 'playing', players: twoPlayers });

    await assertSucceeds(updateDoc(doc(asOtherPlayer(), ROOM_PATH), { status: 'completed' }));
    await assertSucceeds(updateDoc(doc(asOwner(), ROOM_PATH), { status: 'completed' }));
  });

  it('keeps the room alive by pushing its expiry forward', async () => {
    await testEnv.clearFirestore();
    await seedRoom();

    await assertSucceeds(
      updateDoc(doc(asOtherPlayer(), ROOM_PATH), { expiresAt: hoursFromNow(24) }),
    );
  });

  it('accepts the answer the client actually sends, with the room postponed alongside it', async () => {
    // Every write the app makes carries a fresh `expiresAt`, because a room
    // whose expiry stopped moving stops taking writes when it runs out.
    await testEnv.clearFirestore();
    await seedRoom({ status: 'playing', players: twoPlayers });

    await assertSucceeds(
      updateDoc(doc(asOtherPlayer(), ROOM_PATH), {
        'words.w0.guessedByPlayerId': OTHER_PLAYER,
        expiresAt: new Date(Date.now() + 24 * HOUR_MS),
      }),
    );
  });

  it('refuses a write that would stretch the room past its lifetime', async () => {
    await testEnv.clearFirestore();
    await seedRoom();

    await assertFails(updateDoc(doc(asOtherPlayer(), ROOM_PATH), { expiresAt: hoursFromNow(30) }));
  });

  it('refuses to bring an expired room back to life', async () => {
    // The client never tries: the room screen turns everybody away from an
    // expired room without writing anything. The rules refuse it anyway,
    // because a room past its expiry is one the TTL policy has already been
    // told to collect — it can vanish at any moment, and a game resumed inside
    // it would disappear mid-word. Expiry is checked on what the room was, not
    // only on what the write would make it.
    await testEnv.clearFirestore();
    await seedRoom({ expiresAt: hoursFromNow(-1) });

    await assertFails(updateDoc(doc(asOwner(), ROOM_PATH), { expiresAt: hoursFromNow(24) }));
  });

  it('refuses every other write to an expired room too, expiry or no expiry', async () => {
    await testEnv.clearFirestore();
    await seedRoom({ status: 'playing', players: twoPlayers, expiresAt: hoursFromNow(-1) });

    await assertFails(
      updateDoc(doc(asOtherPlayer(), ROOM_PATH), {
        'words.w0.guessedByPlayerId': OTHER_PLAYER,
        expiresAt: hoursFromNow(24),
      }),
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

  it('lets either player end a game that is still on', async () => {
    // Both of them, because either can be the one left alone with a crossword
    // nobody can finish: after the deal, the words hidden from a player can be
    // answered by that player and by nobody else
    // (docs/decisions/0027-a-game-a-player-can-end.md).
    await testEnv.clearFirestore();
    await seedRoom({ status: 'playing', players: twoPlayers });
    await assertSucceeds(updateDoc(doc(asOtherPlayer(), ROOM_PATH), { status: 'closed' }));

    await testEnv.clearFirestore();
    await seedRoom({ status: 'playing', players: twoPlayers });
    await assertSucceeds(updateDoc(doc(asOwner(), ROOM_PATH), { status: 'closed' }));
  });

  it('refuses to reopen a game a player ended', async () => {
    await testEnv.clearFirestore();
    await seedRoom({ status: 'closed', players: twoPlayers });

    await assertFails(updateDoc(doc(asOtherPlayer(), ROOM_PATH), { status: 'playing' }));
  });

  it('refuses to call a game somebody ended a finished one', async () => {
    // The race the two endings create, and the half of it the rules settle
    // rather than the client: the last answer of the crossword lands in the
    // same second as somebody's "End the game", so one client sees a full board
    // while another has already written a decision. Whichever arrives first is
    // what happened in this room; the second is told no, and every screen goes
    // on reading one ending rather than two
    // (docs/decisions/0012-ending-a-game-from-the-received-state.md).
    await testEnv.clearFirestore();
    await seedRoom({ status: 'closed', players: twoPlayers });

    await assertFails(updateDoc(doc(asOtherPlayer(), ROOM_PATH), { status: 'completed' }));
  });

  it('refuses to call a finished game one somebody ended', async () => {
    // The other half of the same race, and it has to be refused too: a room
    // whose crossword was filled in must not be turned into one that was walked
    // out of by whoever pressed the button a moment too late.
    await testEnv.clearFirestore();
    await seedRoom({ status: 'completed', players: twoPlayers });

    await assertFails(updateDoc(doc(asOtherPlayer(), ROOM_PATH), { status: 'closed' }));
  });

  it('refuses a newcomer joining a game a player ended', async () => {
    await testEnv.clearFirestore();
    await seedRoom({ status: 'closed' });

    await assertFails(
      updateDoc(doc(asOtherPlayer(), ROOM_PATH), {
        [`players.${OTHER_PLAYER}`]: { nickname: 'Bob', joinedAt: Timestamp.now() },
      }),
    );
  });

  it('refuses a third player, since a room is played by exactly two', async () => {
    // The room screen stops at two as well (`MAX_PLAYERS` in
    // apps/web/src/rooms/room-access.ts), but joining writes `players.<uid>`
    // without re-reading the room, so this is the only thing deciding it: two
    // guests pressing Join on the same snapshot both get here.
    await testEnv.clearFirestore();
    await seedRoom({ players: twoPlayers });

    await assertFails(
      updateDoc(doc(asThirdPlayer(), ROOM_PATH), {
        [`players.${THIRD_PLAYER}`]: { nickname: 'Cara', joinedAt: Timestamp.now() },
      }),
    );
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

  it('lets the owner deal the words out and open the game', async () => {
    await testEnv.clearFirestore();
    await seedRoom({ players: twoPlayers });

    await assertSucceeds(updateDoc(doc(asOwner(), ROOM_PATH), startGameUpdate()));
  });

  it('refuses to let anyone but the owner start the game', async () => {
    // Without this the room screen would be the only thing keeping a player
    // from dealing the words out on everybody else's behalf.
    await testEnv.clearFirestore();
    await seedRoom({ players: twoPlayers });

    await assertFails(updateDoc(doc(asOtherPlayer(), ROOM_PATH), startGameUpdate()));
  });

  it('refuses to start a game the owner would be sitting in alone', async () => {
    await testEnv.clearFirestore();
    await seedRoom();

    await assertFails(updateDoc(doc(asOwner(), ROOM_PATH), startGameUpdate()));
  });

  it('refuses a newcomer joining a game that has already started', async () => {
    // Every word of a started room is hidden from one of the players who were
    // in at the deal, so a latecomer would be handed the whole word list.
    await testEnv.clearFirestore();
    await seedRoom({ status: 'playing' });

    await assertFails(
      updateDoc(doc(asOtherPlayer(), ROOM_PATH), {
        [`players.${OTHER_PLAYER}`]: { nickname: 'Bob', joinedAt: Timestamp.now() },
      }),
    );
  });

  it('refuses a newcomer joining a game that is already over', async () => {
    await testEnv.clearFirestore();
    await seedRoom({ status: 'completed' });

    await assertFails(
      updateDoc(doc(asOtherPlayer(), ROOM_PATH), {
        [`players.${OTHER_PLAYER}`]: { nickname: 'Bob', joinedAt: Timestamp.now() },
      }),
    );
  });

  it('lets a player of a started game rewrite their own entry, which is how they come back', async () => {
    await testEnv.clearFirestore();
    await seedRoom({ status: 'playing', players: twoPlayers });

    await assertSucceeds(
      updateDoc(doc(asOtherPlayer(), ROOM_PATH), {
        [`players.${OTHER_PLAYER}`]: { nickname: 'Bob', joinedAt: Timestamp.now() },
      }),
    );
  });

  it('refuses to take a player out of a game that has started', async () => {
    // The one write these rules exist to refuse. Words are dealt to UIDs
    // (`words.w0.hiddenFromPlayerId`) and the win is read from those same
    // fields, so a player dropped mid-game leaves their words hidden from
    // nobody — an unfinishable crossword with no way back, since `completed` is
    // terminal and the room cannot be deleted. Presence frees a seat in the
    // lobby and nowhere else; this is what makes that a rule rather than a
    // promise the client keeps.
    await testEnv.clearFirestore();
    await seedRoom({ status: 'playing', players: twoPlayers });

    await assertFails(
      updateDoc(doc(asOwner(), ROOM_PATH), { [`players.${OTHER_PLAYER}`]: deleteField() }),
    );
  });

  it('refuses to take a player out of a room whose game is over', async () => {
    await testEnv.clearFirestore();
    await seedRoom({ status: 'completed', players: twoPlayers });

    await assertFails(
      updateDoc(doc(asOwner(), ROOM_PATH), { [`players.${OTHER_PLAYER}`]: deleteField() }),
    );
  });

  it('refuses to drop a player even by the client that would be left playing alone', async () => {
    await testEnv.clearFirestore();
    await seedRoom({ status: 'playing', players: twoPlayers });

    await assertFails(
      updateDoc(doc(asOtherPlayer(), ROOM_PATH), { [`players.${OWNER}`]: deleteField() }),
    );
  });

  it('refuses to take the owner out of their own lobby, however quiet they are', async () => {
    // The one seat presence never frees, said in the rules as well as on the
    // client: a lobby's roster is otherwise anybody's to write, and a room
    // without its owner is a room nobody can start.
    await testEnv.clearFirestore();
    await seedRoom({ players: twoPlayers });

    await assertFails(
      updateDoc(doc(asThirdPlayer(), ROOM_PATH), {
        [`players.${OWNER}`]: deleteField(),
        [`players.${THIRD_PLAYER}`]: { nickname: 'Cara', joinedAt: Timestamp.now() },
      }),
    );
  });

  it('lets a lobby seat change hands in the one write that takes it', async () => {
    // The other side of the freeze, and what the lobby is open for: a guest who
    // stopped marking themselves present is replaced by the newcomer taking
    // their seat, in a single update — two writes would pass through a room of
    // one or of three, and the rules turn both away.
    await testEnv.clearFirestore();
    await seedRoom({ players: twoPlayers });

    await assertSucceeds(
      updateDoc(doc(asThirdPlayer(), ROOM_PATH), {
        [`players.${OTHER_PLAYER}`]: deleteField(),
        [`players.${THIRD_PLAYER}`]: {
          nickname: 'Cara',
          joinedAt: Timestamp.now(),
          lastSeenAt: Timestamp.now(),
        },
      }),
    );
  });

  it('lets any player finish a game that is already on, not only the owner', async () => {
    await testEnv.clearFirestore();
    await seedRoom({ status: 'playing', players: twoPlayers });

    await assertSucceeds(
      updateDoc(doc(asOtherPlayer(), ROOM_PATH), {
        'words.w0.guessedByPlayerId': OTHER_PLAYER,
        status: 'completed',
      }),
    );
  });

  it('refuses to let anyone delete the room — only the TTL policy may', async () => {
    await testEnv.clearFirestore();
    await seedRoom();

    await assertFails(deleteDoc(doc(asOwner(), ROOM_PATH)));
  });
});

/**
 * The two cases of the seat policy that the rules, and nothing else, hold.
 *
 * Once the words are dealt, the seat of a player who left is frozen — for the
 * host and for their guest alike — and no age of mark changes that. The client
 * agrees (`apps/web/src/rooms/seat-policy.test.ts`), but agreeing is all a
 * client can do: a lobby's roster is anybody's to write, so what stops a
 * started game losing a player is this file and nothing else. The whole policy,
 * all four cases of it, is written out in
 * `docs/decisions/0025-what-happens-to-the-seat-of-a-player-who-left.md`.
 *
 * Said here as scenarios rather than as one rule at a time: the narrower tests
 * above check `freezesPlayersOnceDealt`, and these check what a room does to a
 * player who disappeared mid-word.
 */
describe('the seat of a player who left a game that had started', () => {
  /** The pair, with one of them last heard from hours ago. */
  const withStaleMark = (silentPlayerId) => {
    const present = {
      [OWNER]: { nickname: 'Vik', joinedAt: Timestamp.now(), lastSeenAt: Timestamp.now() },
      [OTHER_PLAYER]: { nickname: 'Bob', joinedAt: Timestamp.now(), lastSeenAt: Timestamp.now() },
    };

    return {
      ...present,
      [silentPlayerId]: { ...present[silentPlayerId], lastSeenAt: hoursFromNow(-3) },
    };
  };

  it('is frozen for the host, however long ago their mark was written', async () => {
    await testEnv.clearFirestore();
    await seedRoom({ status: 'playing', players: withStaleMark(OWNER) });

    // Their guest cannot free the seat, and cannot hand it on either.
    await assertFails(
      updateDoc(doc(asOtherPlayer(), ROOM_PATH), { [`players.${OWNER}`]: deleteField() }),
    );

    // And the host plays on when they come back, marking themselves present.
    await assertSucceeds(
      updateDoc(doc(asOwner(), ROOM_PATH), { [`players.${OWNER}.lastSeenAt`]: Timestamp.now() }),
    );
  });

  it('is frozen for a guest too, and no newcomer is let into their place', async () => {
    await testEnv.clearFirestore();
    await seedRoom({ status: 'playing', players: withStaleMark(OTHER_PLAYER) });

    // The write that takes an abandoned lobby seat, refused here in one piece.
    await assertFails(
      updateDoc(doc(asThirdPlayer(), ROOM_PATH), {
        [`players.${OTHER_PLAYER}`]: deleteField(),
        [`players.${THIRD_PLAYER}`]: {
          nickname: 'Cara',
          joinedAt: Timestamp.now(),
          lastSeenAt: Timestamp.now(),
        },
      }),
    );

    // Nor may a newcomer simply sit down beside the two: the room stays a pair.
    await assertFails(
      updateDoc(doc(asThirdPlayer(), ROOM_PATH), {
        [`players.${THIRD_PLAYER}`]: { nickname: 'Cara', joinedAt: Timestamp.now() },
      }),
    );

    // The guest's own return is the one write about that seat still accepted.
    await assertSucceeds(
      updateDoc(doc(asOtherPlayer(), ROOM_PATH), {
        [`players.${OTHER_PLAYER}.lastSeenAt`]: Timestamp.now(),
      }),
    );
  });
});

describe('anything outside the rooms collection', () => {
  it('is unreachable from a browser', async () => {
    await testEnv.clearFirestore();

    await assertFails(setDoc(doc(asOwner(), 'anything/else'), { hello: 'world' }));
    await assertFails(getDoc(doc(asOwner(), 'anything/else')));
  });
});
