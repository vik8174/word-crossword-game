import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { type Analytics, initializeAnalytics, isSupported, logEvent } from 'firebase/analytics';
import { signInAnonymously } from 'firebase/auth';
import { onSnapshot, updateDoc } from 'firebase/firestore';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AWAY_AFTER_MS, SEAT_FREE_AFTER_MS } from '../rooms/presence';
import { ROOM_ROUTE_PATTERN, roomPath, roomUrl } from '../rooms/room-link';
import { RoomPage } from './RoomPage';

// Firebase is the system boundary: mocked so a player can be walked through the
// whole screen without a project. Everything above it — the access rules, the
// document guard, the grid — runs for real.
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
  initializeAnalytics: vi.fn(),
  isSupported: vi.fn(),
  logEvent: vi.fn(),
  setDefaultEventParameters: vi.fn(),
}));

const HOUR_MS = 60 * 60 * 1000;

/** Stands in for the SDK's `Analytics` handle, which this app never inspects. */
const FAKE_ANALYTICS = { app: 'fake-analytics' } as unknown as Analytics;

/** Every analytics event reported so far, as name and parameters. */
const reportedEvents = () =>
  vi.mocked(logEvent).mock.calls.map(([, name, params]) => ({ name, params }));

/** Whether a write says nothing but that its author is still in the room. */
const isPresenceMark = (update: Record<string, unknown>): boolean =>
  Object.keys(update).every((field) => field === 'expiresAt' || field.endsWith('.lastSeenAt'));

/**
 * Every write this screen made about the game, the presence marks left out.
 *
 * A client in a room marks itself present the moment it arrives and every
 * fifteen seconds after (issue #47), which is a write about nothing that
 * happened on screen. Counting those in would make every assertion about what
 * a player's action wrote depend on how long the test took.
 */
const gameWrites = (): [unknown, Record<string, unknown>][] =>
  (vi.mocked(updateDoc).mock.calls as unknown as [unknown, Record<string, unknown>][]).filter(
    ([, update]) => !isPresenceMark(update),
  );

/** The fields of one of those writes, which the test says must be there. */
const gameWriteAt = (index: number): Record<string, unknown> => {
  const write = gameWrites()[index];

  if (write === undefined) {
    throw new Error(`The screen made no write about the game at position ${index}.`);
  }

  return write[1];
};

const timestamp = (millis: number) => ({ toMillis: () => millis });

/** A one-word crossword whose letters must never reach the screen. */
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

/** Two crossing words, so a player can have one to explain and one to guess. */
const TWO_WORD_LAYOUT = {
  rows: 3,
  cols: 3,
  cells: [...LAYOUT.cells, { row: 1, col: 0, letter: 'A' }, { row: 2, col: 0, letter: 'R' }],
  placedWords: [
    ...LAYOUT.placedWords,
    {
      word: 'car',
      orientation: 'down',
      cells: [
        { row: 0, col: 0 },
        { row: 1, col: 0 },
        { row: 2, col: 0 },
      ],
    },
  ],
  unplacedWords: [],
};

/**
 * Three words, of which two — `cat` across and `car` down — cross at the
 * top-left square and are dealt to the same player, so that player has to fill
 * two of their own words through one shared square.
 */
const CROSSING_LAYOUT = {
  rows: 3,
  cols: 3,
  cells: [
    ...TWO_WORD_LAYOUT.cells,
    { row: 2, col: 1, letter: 'A' },
    { row: 2, col: 2, letter: 'T' },
  ],
  placedWords: [
    ...TWO_WORD_LAYOUT.placedWords,
    {
      word: 'rat',
      orientation: 'across',
      cells: [
        { row: 2, col: 0 },
        { row: 2, col: 1 },
        { row: 2, col: 2 },
      ],
    },
  ],
  unplacedWords: [],
};

/**
 * A player of the room, marking themselves present unless the test says
 * otherwise — which is what every screen here reads them as being.
 */
const player = (nickname: string, joinedAtMillis = 1000, silentForMs = 0) => ({
  nickname,
  joinedAt: timestamp(joinedAtMillis),
  lastSeenAt: timestamp(Date.now() - silentForMs),
});

/** A room as Firestore hands it back, alive unless told otherwise. */
const storedRoom = (overrides: Record<string, unknown> = {}) => ({
  status: 'lobby',
  ownerId: 'owner-uid',
  layout: LAYOUT,
  words: { w0: { hiddenFromPlayerId: null, guessedByPlayerId: null } },
  players: { 'owner-uid': player('Vik') },
  createdAt: timestamp(Date.now() - HOUR_MS),
  expiresAt: timestamp(Date.now() + HOUR_MS),
  ...overrides,
});

/** The snapshot callbacks Firestore would drive the subscription with. */
let emitRoom: (snapshot: { exists: () => boolean; data: () => unknown }) => void;
let failSubscription: (error: unknown) => void;
const unsubscribe = vi.fn();

const renderRoomPage = () =>
  render(
    <MemoryRouter initialEntries={[roomPath('room-1')]}>
      <Routes>
        <Route path={ROOM_ROUTE_PATTERN} element={<RoomPage />} />
      </Routes>
    </MemoryRouter>,
  );

/** Opens the room screen and lets Firestore deliver the room behind the link. */
const openRoom = async (room: unknown = storedRoom()) => {
  renderRoomPage();

  await waitFor(() => expect(onSnapshot).toHaveBeenCalled());
  await act(async () => {
    emitRoom({ exists: () => true, data: () => room });
  });
};

const grid = () => screen.getByRole('group', { name: /crossword grid/i });

/**
 * What the board says with its numbering taken out — which is to say, the
 * letters on it and nothing else.
 *
 * Every square a word begins in carries a crossword number. It is no letter of
 * anybody's word and it may hide none: what is left after the digits are
 * removed is still asserted in full, so a letter that leaked would still be
 * here. What a square is beyond its letter is said in its own label rather than
 * written on the board, so nothing else has to be taken out.
 */
const gridLetters = () => (grid().textContent ?? '').replaceAll(/\d/g, '');

/** This browser is signed in as `guest-uid`, so every room here is read as Bob. */
const VIEWER_ID = 'guest-uid';

/**
 * Every word of a room that is hidden from the player reading it.
 *
 * Read off the room the test hands over rather than written into the test, so a
 * word added to a fixture later is covered without anybody remembering to come
 * back here. This is the list the whole document is checked against.
 */
const wordsHiddenFromViewer = (room: unknown): readonly string[] => {
  const { layout, words } = room as {
    layout: { placedWords: readonly { word: string }[] };
    words: Record<string, { hiddenFromPlayerId?: string | null } | undefined>;
  };

  return layout.placedWords
    .filter((_placed, index) => words[`w${index}`]?.hiddenFromPlayerId === VIEWER_ID)
    .map(({ word }) => word);
};

/**
 * The invariant three tickets were built on, turned inside out and no weaker:
 * not one word this player has to guess appears anywhere in the document.
 *
 * Asserted over the whole of `document.body`, not over the elements a test
 * thought to name — a word that leaked into a heading, a caption or an
 * accessible label would be caught here just the same. The count is asserted
 * as well, so a fixture that stopped hiding anything cannot make this pass by
 * checking nothing at all.
 */
const expectNoHiddenWordOnScreen = (room: unknown) => {
  const hidden = wordsHiddenFromViewer(room);

  expect(hidden.length).toBeGreaterThan(0);

  for (const word of hidden) {
    expect(document.body.textContent ?? '').not.toMatch(new RegExp(`\\b${word}\\b`, 'i'));
  }
};

/** Puts a letter in one square of the grid, as a player typing would. */
const typeInto = (row: number, col: number, letter: string) =>
  fireEvent.change(screen.getByLabelText(new RegExp(`row ${row + 1}, column ${col + 1}\\b`, 'i')), {
    target: { value: letter },
  });

const joinAs = (nickname: string) => {
  fireEvent.change(screen.getByLabelText(/nickname/i), { target: { value: nickname } });
  fireEvent.click(screen.getByRole('button', { name: /join the game/i }));
};

beforeEach(() => {
  // Cleared here rather than after each test: unmounting the previous screen is
  // itself an `afterEach`, and it calls the unsubscribe spy this file asserts on.
  vi.clearAllMocks();
  vi.mocked(signInAnonymously).mockResolvedValue({ user: { uid: 'guest-uid' } } as never);
  vi.mocked(updateDoc).mockResolvedValue(undefined);
  vi.mocked(isSupported).mockResolvedValue(true);
  vi.mocked(initializeAnalytics).mockReturnValue(FAKE_ANALYTICS);
  vi.mocked(onSnapshot).mockImplementation(((
    _reference: unknown,
    onNext: typeof emitRoom,
    onError: typeof failSubscription,
  ) => {
    emitRoom = onNext;
    failSubscription = onError;

    return unsubscribe;
  }) as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RoomPage', () => {
  describe('arriving at the link', () => {
    it('signs the visitor in before reading the room, not after asking for a nickname', async () => {
      let signIn: (() => void) | undefined;
      vi.mocked(signInAnonymously).mockReturnValue(
        new Promise((resolve) => {
          signIn = () => resolve({ user: { uid: 'guest-uid' } } as never);
        }) as never,
      );

      renderRoomPage();

      // The security rules refuse a read from a visitor who is not signed in,
      // so nothing may be read until sign-in has come back.
      expect(onSnapshot).not.toHaveBeenCalled();
      expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();

      await act(async () => signIn?.());

      expect(onSnapshot).toHaveBeenCalledOnce();
    });

    it('asks a newcomer for a nickname', async () => {
      await openRoom();

      expect(screen.getByLabelText(/nickname/i)).toBeInTheDocument();
    });

    it('keeps the door shut until the nickname is usable', async () => {
      await openRoom();
      const join = screen.getByRole('button', { name: /join the game/i });

      expect(join).toBeDisabled();

      fireEvent.change(screen.getByLabelText(/nickname/i), { target: { value: '   ' } });
      expect(join).toBeDisabled();

      fireEvent.change(screen.getByLabelText(/nickname/i), { target: { value: 'Bob' } });
      expect(join).toBeEnabled();
    });

    it('stops following the room when the player leaves the screen', async () => {
      const { unmount } = renderRoomPage();
      await waitFor(() => expect(onSnapshot).toHaveBeenCalled());

      unmount();

      expect(unsubscribe).toHaveBeenCalledOnce();
    });
  });

  describe('the link to the room', () => {
    const bothPlayers = { 'owner-uid': player('Vik'), 'guest-uid': player('Bob', 2000) };
    const inviteLink = () => screen.queryByLabelText(/room link/i);

    it('is on the screen before the room has been read at all', async () => {
      renderRoomPage();

      await waitFor(() => expect(onSnapshot).toHaveBeenCalled());

      // Nothing has been delivered yet: the address is all a link needs, so a
      // player can pass it on while the first snapshot is still on its way.
      expect(screen.getByRole('status')).toHaveTextContent(/connecting/i);
      expect(inviteLink()).toHaveValue(roomUrl('room-1', window.location.origin));
    });

    it('is offered to a visitor who has not given a nickname yet', async () => {
      await openRoom();

      expect(screen.getByLabelText(/nickname/i)).toBeInTheDocument();
      expect(inviteLink()).toHaveValue(roomUrl('room-1', window.location.origin));
    });

    it('is offered to a player waiting in the lobby, owner or not', async () => {
      await openRoom(storedRoom({ players: bothPlayers }));

      expect(inviteLink()).toHaveValue(roomUrl('room-1', window.location.origin));
    });

    it('goes once the words are dealt out, because it lets nobody in any more', async () => {
      await openRoom(
        storedRoom({
          status: 'playing',
          players: bothPlayers,
          words: { w0: { hiddenFromPlayerId: 'guest-uid', guessedByPlayerId: null } },
        }),
      );

      expect(inviteLink()).not.toBeInTheDocument();
    });

    it('is not offered for a room that is not there', async () => {
      renderRoomPage();
      await waitFor(() => expect(onSnapshot).toHaveBeenCalled());

      await act(async () => {
        emitRoom({ exists: () => false, data: () => undefined });
      });

      expect(inviteLink()).not.toBeInTheDocument();
    });
  });

  describe('joining', () => {
    it('adds the player to the room under their own auth id', async () => {
      await openRoom();

      joinAs('Bob');

      await waitFor(() =>
        expect(updateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            'players.guest-uid': {
              nickname: 'Bob',
              joinedAt: expect.any(Date),
              lastSeenAt: expect.any(Date),
            },
          }),
        ),
      );
    });

    it('stores the nickname as the other players will read it', async () => {
      await openRoom();

      joinAs('  Bob   the   Builder ');

      await waitFor(() =>
        expect(updateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            'players.guest-uid': expect.objectContaining({ nickname: 'Bob the Builder' }),
          }),
        ),
      );
    });

    it('shows the room as soon as the player is in it', async () => {
      await openRoom();
      joinAs('Bob');

      await act(async () => {
        emitRoom({
          exists: () => true,
          data: () =>
            storedRoom({
              players: { 'owner-uid': player('Vik'), 'guest-uid': player('Bob', 2000) },
            }),
        });
      });

      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();
    });

    it('explains a join the database refused, and lets the player try again', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(updateDoc).mockRejectedValue(new Error('Missing or insufficient permissions.'));
      await openRoom();

      joinAs('Bob');

      expect(await screen.findByText(/could not join the game/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /join the game/i })).toBeEnabled();
    });

    it('reports a player who really got in, and never the name they got in under', async () => {
      await openRoom();

      joinAs('Bob');

      await waitFor(() => {
        expect(reportedEvents()).toEqual([{ name: 'player_joined', params: {} }]);
      });
      expect(JSON.stringify(reportedEvents())).not.toContain('Bob');
      expect(JSON.stringify(reportedEvents())).not.toContain('room-1');
    });

    it('reports nothing when the join was refused', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(updateDoc).mockRejectedValue(new Error('Missing or insufficient permissions.'));
      await openRoom();

      joinAs('Bob');

      await screen.findByText(/could not join the game/i);
      expect(reportedEvents()).toEqual([]);
    });
  });

  describe('inside the room', () => {
    const roomWithBoth = storedRoom({
      players: { 'owner-uid': player('Vik'), 'guest-uid': player('Bob', 2000) },
    });

    it('lets a player who is already in straight back to the game', async () => {
      await openRoom(roomWithBoth);

      expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();
      expect(screen.getByText('Vik')).toBeInTheDocument();
    });

    it('shows everyone in the room, in the order they joined', async () => {
      await openRoom(roomWithBoth);

      const names = screen.getAllByRole('listitem').map((item) => item.textContent);

      expect(names[0]).toContain('Vik');
      expect(names[1]).toContain('Bob');
    });

    it('shows a player arriving without anyone reloading the page', async () => {
      // Watched by the owner, alone in the room they made: a room is played by
      // two, so the seat the guest with the link takes is the only one there is
      // to watch being filled.
      vi.mocked(signInAnonymously).mockResolvedValue({ user: { uid: 'owner-uid' } } as never);
      await openRoom(storedRoom());

      expect(screen.queryByText('Bob')).not.toBeInTheDocument();

      await act(async () => {
        emitRoom({ exists: () => true, data: () => roomWithBoth });
      });

      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('draws the crossword without giving a single letter away', async () => {
      await openRoom(roomWithBoth);

      expect(grid()).toBeInTheDocument();
      expect(gridLetters()).toBe('');
      expect(screen.queryByText(/\bcat\b/i)).not.toBeInTheDocument();
    });
  });

  describe('coming back to the link', () => {
    // A player who closed the tab, lost the connection, or simply reloaded gets
    // the same anonymous auth id back from the browser, so the room already
    // holds them. Nothing on this screen may ask them who they are again, and
    // nothing may be written to say they arrived: they never left.
    const bothPlayers = { 'owner-uid': player('Vik'), 'guest-uid': player('Bob', 2000) };

    const assignedWords = {
      w0: { hiddenFromPlayerId: 'guest-uid', guessedByPlayerId: null },
      w1: { hiddenFromPlayerId: 'owner-uid', guessedByPlayerId: null },
    };

    it('puts a player waiting in the lobby back where they were', async () => {
      await openRoom(storedRoom({ players: bothPlayers }));

      expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      // The mark this client writes for itself is not an arrival: nothing says
      // they joined, because they never left.
      expect(gameWrites()).toEqual([]);
    });

    it('gives a player back their own half of a game in progress', async () => {
      const room = storedRoom({
        status: 'playing',
        layout: TWO_WORD_LAYOUT,
        players: bothPlayers,
        words: assignedWords,
      });

      await openRoom(room);

      // `car` is Bob's to explain — written down the left column of his grid —
      // and `cat` is his to guess: the same room he left, secrets and all.
      expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();
      expect(gridLetters()).toBe('CAR');
      expectNoHiddenWordOnScreen(room);
      // `cat` shares its first square with the `car` he explains, so the two
      // squares left of it are the ones he types in.
      expect(screen.getAllByLabelText(/a letter of one of your words/i)).toHaveLength(2);
      expect(gameWrites()).toEqual([]);
    });

    it('keeps the answers that were given while the player was away', async () => {
      await openRoom(
        storedRoom({
          status: 'playing',
          layout: TWO_WORD_LAYOUT,
          players: bothPlayers,
          words: {
            w0: { hiddenFromPlayerId: 'guest-uid', guessedByPlayerId: null },
            w1: { hiddenFromPlayerId: 'owner-uid', guessedByPlayerId: 'owner-uid' },
          },
        }),
      );

      // Vik answered `car` while Bob was gone; the grid he comes back to says so.
      expect(gridLetters()).toBe('CAR');
    });

    it('gives a player back a game that finished while they were away', async () => {
      await openRoom(
        storedRoom({
          status: 'completed',
          layout: TWO_WORD_LAYOUT,
          players: bothPlayers,
          words: {
            w0: { hiddenFromPlayerId: 'guest-uid', guessedByPlayerId: 'guest-uid' },
            w1: { hiddenFromPlayerId: 'owner-uid', guessedByPlayerId: 'owner-uid' },
          },
        }),
      );

      expect(screen.getByText(/every word is in/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();
    });

    it('knows the player by the id their browser came back with, not by a name', async () => {
      // The nickname in the room is whatever they typed the first time. It is
      // the auth id that says they are in, so a different name changes nothing.
      await openRoom(
        storedRoom({
          players: { 'owner-uid': player('Vik'), 'guest-uid': player('Somebody Else', 2000) },
        }),
      );

      expect(screen.getByText('Somebody Else')).toBeInTheDocument();
      expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();
    });

    it('asks for a nickname when the browser comes back as somebody the room has never seen', async () => {
      // Clearing the browser's storage loses the anonymous user, and the new id
      // is a newcomer — which is what the nickname form is for.
      await openRoom(storedRoom({ players: { 'owner-uid': player('Vik') } }));

      expect(screen.getByLabelText(/nickname/i)).toBeInTheDocument();
    });
  });

  describe('keeping the room alive', () => {
    it('pushes the expiry further out with the answer it writes', async () => {
      // The security rules read `expiresAt` on every update, so a room that
      // stopped being postponed refuses writes the moment its 24 hours are up —
      // in the middle of a game that ran long. Every write postpones it.
      const expiresAt = Date.now() + HOUR_MS;

      await openRoom(
        storedRoom({
          status: 'playing',
          layout: TWO_WORD_LAYOUT,
          players: { 'owner-uid': player('Vik'), 'guest-uid': player('Bob', 2000) },
          words: {
            w0: { hiddenFromPlayerId: 'guest-uid', guessedByPlayerId: null },
            w1: { hiddenFromPlayerId: 'owner-uid', guessedByPlayerId: null },
          },
          expiresAt: timestamp(expiresAt),
        }),
      );

      // The `C` is already there: `cat` crosses the `car` Bob explains.
      await act(async () => {
        typeInto(0, 1, 'a');
        typeInto(0, 2, 't');
      });

      const update = gameWriteAt(0);

      expect(update.expiresAt).toBeInstanceOf(Date);
      expect((update.expiresAt as Date).getTime()).toBeGreaterThan(expiresAt);
    });
  });

  describe('starting the game', () => {
    const bothPlayers = { 'owner-uid': player('Vik'), 'guest-uid': player('Bob', 2000) };
    const assignedWords = { w0: { hiddenFromPlayerId: 'guest-uid', guessedByPlayerId: null } };
    const startButton = () => screen.getByRole('button', { name: /start the game/i });

    /** Opens the room as its owner rather than as the visitor everything else runs as. */
    const openRoomAsOwner = async (room: unknown) => {
      vi.mocked(signInAnonymously).mockResolvedValue({ user: { uid: 'owner-uid' } } as never);

      await openRoom(room);
    };

    it('deals every word out to a player and opens the game', async () => {
      await openRoomAsOwner(storedRoom({ layout: TWO_WORD_LAYOUT, players: bothPlayers }));

      fireEvent.click(startButton());

      await waitFor(() => expect(updateDoc).toHaveBeenCalled());
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'playing',
          'words.w0.hiddenFromPlayerId': expect.stringMatching(/^(owner|guest)-uid$/),
        }),
      );
    });

    it('keeps the game shut while the owner is waiting alone', async () => {
      await openRoomAsOwner(storedRoom());

      expect(startButton()).toBeDisabled();
      expect(screen.getByText(/this room needs 1 more/i)).toBeInTheDocument();
    });

    it('keeps the game shut when the crossword has fewer words than players', async () => {
      // One word between two players would leave one of them nothing to guess,
      // and every word of the room readable.
      await openRoomAsOwner(storedRoom({ players: bothPlayers }));

      expect(startButton()).toBeDisabled();
      expect(screen.getByText(/nothing to guess/i)).toBeInTheDocument();
    });

    it('offers the start to nobody but the owner', async () => {
      await openRoom(storedRoom({ players: bothPlayers }));

      expect(screen.queryByRole('button', { name: /start the game/i })).not.toBeInTheDocument();
    });

    it('explains a start the database refused, and lets the owner try again', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(updateDoc).mockRejectedValue(new Error('Missing or insufficient permissions.'));
      await openRoomAsOwner(storedRoom({ layout: TWO_WORD_LAYOUT, players: bothPlayers }));

      fireEvent.click(startButton());

      expect(await screen.findByText(/could not start the game/i)).toBeInTheDocument();
      expect(startButton()).toBeEnabled();
    });

    it('takes the start away once the game is on', async () => {
      await openRoomAsOwner(
        storedRoom({ status: 'playing', players: bothPlayers, words: assignedWords }),
      );

      expect(screen.queryByRole('button', { name: /start the game/i })).not.toBeInTheDocument();
      expect(screen.getByText(/the game is on/i)).toBeInTheDocument();
    });
  });

  describe('once the words are dealt out', () => {
    const assignedRoom = storedRoom({
      status: 'playing',
      layout: TWO_WORD_LAYOUT,
      players: { 'owner-uid': player('Vik'), 'guest-uid': player('Bob', 2000) },
      words: {
        w0: { hiddenFromPlayerId: 'guest-uid', guessedByPlayerId: null },
        w1: { hiddenFromPlayerId: 'owner-uid', guessedByPlayerId: null },
      },
    });

    it('writes the words a player explains into their own grid, in place', async () => {
      await openRoom(assignedRoom);

      // `car` runs down the left column and is Bob's to explain, so he reads it
      // where it sits and can say what it crosses.
      expect(gridLetters()).toBe('CAR');
      expect(within(grid()).getAllByLabelText(/yours to explain/i)).toHaveLength(3);
    });

    it('never puts a word hidden from the player anywhere on their screen', async () => {
      await openRoom(assignedRoom);

      expectNoHiddenWordOnScreen(assignedRoom);
    });

    it('lists both halves of the game by number, and names only the half that is safe', async () => {
      await openRoom(assignedRoom);

      // `cat` and `car` begin in the same square and share its number, so the
      // direction is what tells them apart — which is how the players say them.
      expect(screen.getByText(/1 down — car/i)).toBeInTheDocument();
      expect(screen.getByText(/1 across — still to answer/i)).toBeInTheDocument();
      expect(screen.getByText('0 of 1 answered.')).toBeInTheDocument();
    });

    it('numbers the board, so a player can say which word they mean', async () => {
      await openRoom(assignedRoom);

      // `cat` and `car` both begin in the top-left square, and one number
      // covers the two of them — as it would in a printed crossword. That
      // square holds a word Bob explains, so its number is said in what the
      // square says of itself.
      expect(screen.getByLabelText(/row 1, column 1\b/i)).toHaveAccessibleName(/^Number 1, /i);
      expect(grid().textContent).toContain('1');
    });

    it('opens the squares of the words a player has to guess, bar the ones already written', async () => {
      await openRoom(assignedRoom);

      // `cat` runs across the top and is Bob's to guess. Its first square is
      // the one the `car` he explains starts in, and that letter is already in
      // front of him — so the two after it are what he types.
      expect(screen.getAllByLabelText(/a letter of one of your words/i)).toHaveLength(2);
      expect(screen.getByLabelText(/row 1, column 3/i)).toHaveAccessibleName(/one of your words/i);
      // Every square can be moved onto; these two are simply not his to fill.
      expect(screen.getByLabelText(/row 1, column 1\b/i)).toHaveAccessibleName(/yours to explain/i);
      expect(screen.getByLabelText(/row 3, column 1/i)).not.toHaveAccessibleName(
        /one of your words/i,
      );
    });

    it('shows no word at all to a player the deal did not cover', async () => {
      // Joined in the instant between the owner reading the room and writing
      // the deal: in the room, in nobody's assignment. Every word would read as
      // theirs to explain, which is the whole crossword.
      await openRoom(
        storedRoom({
          status: 'playing',
          layout: TWO_WORD_LAYOUT,
          players: {
            'owner-uid': player('Vik'),
            'third-uid': player('Cara', 2000),
            'guest-uid': player('Bob', 3000),
          },
          words: {
            w0: { hiddenFromPlayerId: 'owner-uid', guessedByPlayerId: null },
            w1: { hiddenFromPlayerId: 'third-uid', guessedByPlayerId: null },
          },
        }),
      );

      // The case the inverted invariant breaks in most easily: no word of this
      // crossword is one they have to guess, so a screen asking "which words
      // are not hidden from me?" would write the whole thing out for them.
      expect(document.body.textContent).not.toMatch(/\bcat\b|\bcar\b/i);
      expect(gridLetters()).toBe('');
      expect(screen.getByText(/running without you/i)).toBeInTheDocument();
      // The rest of the room still behaves as it did, minus anything to type in.
      expect(screen.getByText('Cara')).toBeInTheDocument();
      expect(grid()).toBeInTheDocument();
      expect(screen.queryByLabelText(/a letter of one of your words/i)).not.toBeInTheDocument();
    });

    it('shows nobody any word while the room is still in the lobby', async () => {
      await openRoom(
        storedRoom({ layout: TWO_WORD_LAYOUT, players: { 'guest-uid': player('Bob') } }),
      );

      expect(screen.queryByText('car')).not.toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/\bcat\b/i);
    });
  });

  describe('answering a word', () => {
    /** Bob guesses `cat` across the top row; `car` down the left is Vik's. */
    const playing = (words?: Record<string, unknown>) =>
      storedRoom({
        status: 'playing',
        layout: TWO_WORD_LAYOUT,
        players: { 'owner-uid': player('Vik'), 'guest-uid': player('Bob', 2000) },
        words: words ?? {
          w0: { hiddenFromPlayerId: 'guest-uid', guessedByPlayerId: null },
          w1: { hiddenFromPlayerId: 'owner-uid', guessedByPlayerId: null },
        },
      });

    /**
     * Answers `cat`, which is two letters of typing rather than three: its
     * first square is the one the `car` Bob explains begins in, so the `C` is
     * already written into his grid and is nobody's to type over.
     */
    const spellCat = async () => {
      await act(async () => {
        typeInto(0, 1, 'a');
        typeInto(0, 2, 't');
      });
    };

    it('writes a right answer down under the answering player, and nothing else', async () => {
      await openRoom(playing());

      await spellCat();

      expect(gameWrites()).toEqual([
        [expect.anything(), expect.objectContaining({ 'words.w0.guessedByPlayerId': 'guest-uid' })],
      ]);
    });

    it('keeps a wrong answer to the player who made it', async () => {
      await openRoom(playing());

      await act(async () => {
        typeInto(0, 1, 'x');
        typeInto(0, 2, 't');
      });

      expect(gameWrites()).toEqual([]);
      expect(screen.getByText(/not the word/i)).toBeInTheDocument();
    });

    it('moves a word from this player alone to the whole group when its guesser answers it', async () => {
      // The path the ticket turns on, walked end to end: Bob has `car` written
      // into his grid to explain, Vik answers it, and Bob's screen has to stop
      // saying it is his to explain — or he goes on explaining a solved word
      // while everybody waits.
      await openRoom(playing());
      expect(gridLetters()).toBe('CAR');
      expect(within(grid()).getAllByLabelText(/yours to explain/i)).toHaveLength(3);

      await act(async () => {
        emitRoom({
          exists: () => true,
          data: () =>
            playing({
              w0: { hiddenFromPlayerId: 'guest-uid', guessedByPlayerId: null },
              w1: { hiddenFromPlayerId: 'owner-uid', guessedByPlayerId: 'owner-uid' },
            }),
        });
      });

      expect(gridLetters()).toBe('CAR');
      expect(within(grid()).queryByLabelText(/yours to explain/i)).not.toBeInTheDocument();
      expect(screen.getByText(/1 down — car — answered/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/row 1, column 1\b/i)).not.toHaveAccessibleName(
        /one of your words/i,
      );
    });

    it('locks the squares of a word once it has been answered', async () => {
      const room = playing({
        w0: { hiddenFromPlayerId: 'guest-uid', guessedByPlayerId: 'guest-uid' },
        w1: { hiddenFromPlayerId: 'owner-uid', guessedByPlayerId: null },
      });

      await openRoom(room);

      // `CAT` across the top is answered; the `AR` below the shared `C` is
      // still Bob's to explain, and neither takes another letter from him.
      expect(gridLetters()).toBe('CATAR');
      expect(screen.queryByLabelText(/a letter of one of your words/i)).not.toBeInTheDocument();
      expect(screen.getByText('1 of 1 answered.')).toBeInTheDocument();
      expect(screen.getByText(/1 across — answered/i)).toBeInTheDocument();
    });

    it('leaves the room to another ticket to finish', async () => {
      // Every word of this room is now answered, but nothing here declares the
      // game over: the win belongs to issue #8.
      await openRoom(playing());

      await spellCat();

      expect(updateDoc).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: expect.anything() }),
      );
    });

    it('explains an answer the database refused', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(updateDoc).mockRejectedValue(new Error('Missing or insufficient permissions.'));
      await openRoom(playing());

      await spellCat();

      expect(await screen.findByText(/could not be told about it/i)).toBeInTheDocument();
    });

    it('crosses out a word this player explains once its guesser has answered it', async () => {
      await openRoom(
        playing({
          w0: { hiddenFromPlayerId: 'guest-uid', guessedByPlayerId: null },
          w1: { hiddenFromPlayerId: 'owner-uid', guessedByPlayerId: 'owner-uid' },
        }),
      );

      // `car` is Bob's to explain and Vik has just answered it: there is
      // nothing left to explain, and the panel says so as well as the grid.
      expect(screen.getByText(/1 down — car — answered/i)).toBeInTheDocument();
    });

    it('fills two of a player own crossing words without the cursor going astray', async () => {
      // `cat` across and `car` down are both Bob's, sharing the top-left
      // square. Starting on that square gives him the across word; the space
      // bar turns him down it, and the letters follow him rather than the grid.
      const room = storedRoom({
        status: 'playing',
        layout: CROSSING_LAYOUT,
        players: { 'owner-uid': player('Vik'), 'guest-uid': player('Bob', 2000) },
        words: {
          w0: { hiddenFromPlayerId: 'guest-uid', guessedByPlayerId: null },
          w1: { hiddenFromPlayerId: 'guest-uid', guessedByPlayerId: null },
          w2: { hiddenFromPlayerId: 'owner-uid', guessedByPlayerId: null },
        },
      });

      await openRoom(room);
      expectNoHiddenWordOnScreen(room);

      const shared = screen.getByLabelText(/row 1, column 1\b/i);

      await act(async () => shared.focus());
      expect(shared).toHaveAccessibleName(/filled across, where two of them cross/i);

      await act(async () => {
        fireEvent.keyDown(shared, { key: ' ' });
      });
      expect(shared).toHaveAccessibleName(/filled down/i);

      // `rat` is Bob's to explain and it runs along the bottom row, so the last
      // square of his `car` arrives written and he types the two above it.
      await act(async () => {
        typeInto(0, 0, 'c');
        typeInto(1, 0, 'a');
      });

      expect(gameWrites()).toEqual([
        [expect.anything(), expect.objectContaining({ 'words.w1.guessedByPlayerId': 'guest-uid' })],
      ]);
    });

    /** `cat` across and `car` down are both Bob's; `rat` along the bottom is his to explain. */
    const crossingRoom = () =>
      storedRoom({
        status: 'playing',
        layout: CROSSING_LAYOUT,
        players: { 'owner-uid': player('Vik'), 'guest-uid': player('Bob', 2000) },
        words: {
          w0: { hiddenFromPlayerId: 'guest-uid', guessedByPlayerId: null },
          w1: { hiddenFromPlayerId: 'guest-uid', guessedByPlayerId: null },
          w2: { hiddenFromPlayerId: 'owner-uid', guessedByPlayerId: null },
        },
      });

    /** Presses a key where the cursor is, as a player with both hands on the keys does. */
    const press = (key: string) =>
      act(async () => {
        fireEvent.keyDown(document.activeElement ?? document.body, { key });
      });

    it('plays two of a player own crossing words from the keyboard alone', async () => {
      const room = crossingRoom();

      await openRoom(room);

      // Where the Tab key lands: the first square of the board this player may
      // fill, which is the one `cat` and `car` share.
      const start = screen.getByLabelText(/row 1, column 1\b/i);
      await act(async () => start.focus());

      await act(async () => {
        typeInto(0, 0, 'c');
        typeInto(0, 1, 'a');
        typeInto(0, 2, 't');
      });

      expect(gameWrites()).toEqual([
        [expect.anything(), expect.objectContaining({ 'words.w0.guessedByPlayerId': 'guest-uid' })],
      ]);

      // Back along the row and down into the other word, without a mouse: the
      // arrow down takes the word running that way through the square it
      // arrives at, which is what keeps the next letter under the cursor.
      await press('ArrowLeft');
      await press('ArrowLeft');
      await press('ArrowDown');
      await act(async () => typeInto(1, 0, 'x'));
      await press('Backspace');
      expect(screen.getByLabelText(/row 2, column 1\b/i)).toHaveValue('');

      // `rat` is Bob's to explain and it runs along the bottom row, so the last
      // square of `car` arrives written and this is its last empty one.
      await act(async () => typeInto(1, 0, 'a'));

      expect(gameWrites()).toHaveLength(2);
      expect(gameWrites().at(-1)).toEqual([
        expect.anything(),
        expect.objectContaining({ 'words.w1.guessedByPlayerId': 'guest-uid' }),
      ]);
      expectNoHiddenWordOnScreen(room);
    });

    it('takes the player to a word they tap in either half of the panel', async () => {
      // Half the board is off a phone screen, so the panel is how a word named
      // out loud is found. Bob explains `car` down the left and guesses `cat`
      // across the top.
      await openRoom(playing());

      fireEvent.click(screen.getByRole('button', { name: /1 across — still to answer/i }));

      // The first square of `cat` holds the `C` of the `car` he explains, so
      // the word is reached at the first square that is still his to fill.
      expect(document.activeElement).toHaveAccessibleName(
        /row 1, column 2 — a letter of one of your words/i,
      );

      fireEvent.click(screen.getByRole('button', { name: /1 down — car/i }));

      // A word he explains is brought into view and stays nobody's to type in.
      expect(document.activeElement).toHaveAccessibleName(/row 1, column 1 — C, yours to explain/i);
    });
  });

  describe('finishing the game', () => {
    /** Bob (this browser) guesses `cat`; `car` is Vik's to guess. */
    const withWords = (words: Record<string, unknown>, status = 'playing') =>
      storedRoom({
        status,
        layout: TWO_WORD_LAYOUT,
        players: { 'owner-uid': player('Vik'), 'guest-uid': player('Bob', 2000) },
        words,
      });

    const open = { hiddenFromPlayerId: 'guest-uid', guessedByPlayerId: null };
    const catAnswered = { hiddenFromPlayerId: 'guest-uid', guessedByPlayerId: 'guest-uid' };
    const carOpen = { hiddenFromPlayerId: 'owner-uid', guessedByPlayerId: null };
    const carAnswered = { hiddenFromPlayerId: 'owner-uid', guessedByPlayerId: 'owner-uid' };

    const emit = (room: unknown) =>
      act(async () => {
        emitRoom({ exists: () => true, data: () => room });
      });

    it('leaves the game open while a single word is still unanswered', async () => {
      await openRoom(withWords({ w0: catAnswered, w1: carOpen }));

      expect(gameWrites()).toEqual([]);
    });

    it('closes the game the moment the room shows every word answered', async () => {
      await openRoom(withWords({ w0: catAnswered, w1: carOpen }));

      await emit(withWords({ w0: catAnswered, w1: carAnswered }));

      expect(gameWrites()).toEqual([
        [expect.anything(), expect.objectContaining({ status: 'completed' })],
      ]);
    });

    it('closes it from the room that arrived, not from the answer this player sent', async () => {
      // The trap this ticket turns on. Bob answers `cat` while Vik answers `car`
      // in the same second: neither of them, looking at the room they answered
      // in, was the last one. Read that way, nobody would ever close the game
      // and a full grid would sit in `playing` for good.
      await openRoom(withWords({ w0: open, w1: carOpen }));

      // The `C` is already on Bob's board: it begins the `car` he explains.
      await act(async () => {
        typeInto(0, 1, 'a');
        typeInto(0, 2, 't');
      });

      expect(gameWrites()).toEqual([
        [expect.anything(), expect.objectContaining({ 'words.w0.guessedByPlayerId': 'guest-uid' })],
      ]);

      await emit(withWords({ w0: catAnswered, w1: carAnswered }));

      expect(gameWrites().at(-1)).toEqual([
        expect.anything(),
        expect.objectContaining({ status: 'completed' }),
      ]);
      expect(gameWrites()).toHaveLength(2);
    });

    it('writes the finished status once, however many snapshots follow', async () => {
      const finished = withWords({ w0: catAnswered, w1: carAnswered });

      await openRoom(finished);
      await emit(finished);
      await emit(withWords({ w0: catAnswered, w1: carAnswered }, 'completed'));

      expect(gameWrites()).toHaveLength(1);
    });

    it('writes nothing more once the room already says the game is over', async () => {
      await openRoom(withWords({ w0: catAnswered, w1: carAnswered }, 'completed'));

      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('reports a finished game by its size and by how many played it', async () => {
      await openRoom(withWords({ w0: catAnswered, w1: carOpen }));

      await emit(withWords({ w0: catAnswered, w1: carAnswered }));

      await waitFor(() => {
        expect(reportedEvents()).toEqual([
          { name: 'game_completed', params: { word_count: 2, player_count: 2 } },
        ]);
      });
      expect(JSON.stringify(reportedEvents())).not.toContain('room-1');
      // The words themselves are in the room document this screen is holding.
      expect(JSON.stringify(reportedEvents())).not.toContain('cat');
    });

    it('reports nothing when closing the game was refused', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(updateDoc).mockRejectedValue(new Error('Missing or insufficient permissions.'));
      await openRoom(withWords({ w0: catAnswered, w1: carOpen }));

      await emit(withWords({ w0: catAnswered, w1: carAnswered }));

      await waitFor(() => expect(updateDoc).toHaveBeenCalled());
      expect(reportedEvents()).toEqual([]);
    });

    it('shows the finished game to a player who answered nothing, without a reload', async () => {
      await openRoom(withWords({ w0: open, w1: carOpen }));
      expect(screen.queryByText(/every word is in/i)).not.toBeInTheDocument();

      await emit(withWords({ w0: catAnswered, w1: carAnswered }, 'completed'));

      expect(screen.getByText(/every word is in/i)).toBeInTheDocument();
      expect(screen.getByText(/all 2 of its words, between the 2 of you/i)).toBeInTheDocument();
    });

    it('spells the whole crossword out only once it is over', async () => {
      await openRoom(withWords({ w0: open, w1: carOpen }));
      // `cat` is Bob's to guess, so until the game ends it is nowhere on screen.
      expect(document.body.textContent).not.toMatch(/\bcat\b/i);

      await emit(withWords({ w0: catAnswered, w1: carAnswered }, 'completed'));

      expect(screen.getByText('cat')).toBeInTheDocument();
      expect(screen.getByText('car')).toBeInTheDocument();
    });

    it('gives a player who comes back to the link their finished game, not a refusal', async () => {
      await openRoom(withWords({ w0: catAnswered, w1: carAnswered }, 'completed'));

      expect(screen.getByText(/every word is in/i)).toBeInTheDocument();
      expect(screen.queryByText(/this game is over/i)).not.toBeInTheDocument();
    });

    it('tells a visitor arriving after the game that it is over, not that it is on', async () => {
      await openRoom(
        storedRoom({
          status: 'completed',
          layout: TWO_WORD_LAYOUT,
          players: { 'owner-uid': player('Vik'), 'third-uid': player('Cara', 2000) },
          words: { w0: catAnswered, w1: carAnswered },
        }),
      );

      expect(screen.getByText(/this game is over/i)).toBeInTheDocument();
      expect(screen.queryByText(/already begun/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();
      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('spells nothing out for a room merely marked finished, without a word answered', async () => {
      // The security rules cannot walk the `words` map, so any client that
      // knows the room id can write `completed` over a game nobody played. The
      // word list must not follow that field: it follows the board.
      const room = withWords({ w0: open, w1: carOpen }, 'completed');

      await openRoom(room);

      expectNoHiddenWordOnScreen(room);
      expect(screen.queryByText(/every word is in/i)).not.toBeInTheDocument();
      expect(screen.getByText(/this room is closed/i)).toBeInTheDocument();
    });

    it('says of a closed room that the reader keeps only the words they explained', async () => {
      // `car` was Bob's to explain, so it is still written into his grid — as
      // it was all game, and no more of a secret now than it was then. The
      // notice has to say so, or it promises a blank board it does not show.
      const room = withWords({ w0: open, w1: carOpen }, 'completed');

      await openRoom(room);

      expect(gridLetters()).toBe('CAR');
      expect(
        screen.getByText(/apart from the ones that were yours to explain/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/apart from any that were yours to explain/i)).toBeInTheDocument();
    });

    it('stops taking answers in a closed room, whatever it says about its words', async () => {
      // The notice says the room is closed; a grid that went on accepting
      // letters underneath it would be saying the opposite.
      await openRoom(withWords({ w0: open, w1: carOpen }, 'completed'));

      expect(screen.queryAllByRole('textbox')).toHaveLength(0);
      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('keeps the celebration for a room that really did finish its crossword', async () => {
      await openRoom(withWords({ w0: catAnswered, w1: carAnswered }, 'completed'));

      expect(screen.getByText(/every word is in/i)).toBeInTheDocument();
      expect(screen.queryByText(/this room is closed/i)).not.toBeInTheDocument();
    });

    it('says nothing about the finished game the room could not be told about', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(updateDoc).mockRejectedValue(new Error('Missing or insufficient permissions.'));

      await openRoom(withWords({ w0: catAnswered, w1: carAnswered }));

      // The grid is full on this screen either way, and any other client in the
      // room closes the game — a message here would only be noise.
      await waitFor(() => expect(updateDoc).toHaveBeenCalled());
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('a link that leads nowhere', () => {
    it('says so when the room was never there or has already been cleaned up', async () => {
      renderRoomPage();
      await waitFor(() => expect(onSnapshot).toHaveBeenCalled());

      await act(async () => {
        emitRoom({ exists: () => false, data: () => undefined });
      });

      expect(screen.getByText(/no game at this link/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();
    });

    it('says so when the room is collected while it is on the screen', async () => {
      // The TTL policy deletes a room whenever it gets round to it, including
      // with the game open in front of somebody. What follows must be a notice,
      // not a screen drawing a room that is no longer there.
      await openRoom(
        storedRoom({ players: { 'owner-uid': player('Vik'), 'guest-uid': player('Bob', 2000) } }),
      );
      expect(screen.getByText('Vik')).toBeInTheDocument();

      await act(async () => {
        emitRoom({ exists: () => false, data: () => undefined });
      });

      expect(screen.getByText(/no game at this link/i)).toBeInTheDocument();
      expect(screen.queryByText('Vik')).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();
    });

    it('says so when the address carries no room id at all', () => {
      render(
        <MemoryRouter>
          <RoomPage />
        </MemoryRouter>,
      );

      expect(screen.getByText(/no game at this link/i)).toBeInTheDocument();
    });
  });

  describe('a room that cannot be joined', () => {
    it('explains an expired room instead of letting the write be refused', async () => {
      await openRoom(storedRoom({ expiresAt: timestamp(Date.now() - HOUR_MS) }));

      expect(screen.getByText(/room has expired/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();
      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('explains an expired room even to a player who was in it', async () => {
      await openRoom(
        storedRoom({
          players: { 'guest-uid': player('Bob') },
          expiresAt: timestamp(Date.now() - HOUR_MS),
        }),
      );

      expect(screen.getByText(/room has expired/i)).toBeInTheDocument();
    });

    it('turns away a visitor who opened the link after the words were dealt out', async () => {
      // Every word of a started room is hidden from one of the players who were
      // in at the deal, so a latecomer allowed in would be shown all of them.
      await openRoom(
        storedRoom({
          status: 'playing',
          layout: TWO_WORD_LAYOUT,
          players: { 'owner-uid': player('Vik'), 'third-uid': player('Cara', 2000) },
          words: {
            w0: { hiddenFromPlayerId: 'owner-uid', guessedByPlayerId: null },
            w1: { hiddenFromPlayerId: 'third-uid', guessedByPlayerId: null },
          },
        }),
      );

      expect(screen.getByText(/already begun/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/\bcat\b|\bcar\b/i);
      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('turns away a third player, and tells them what the game is', async () => {
      const crowd = Object.fromEntries(
        ['a', 'b'].map((id, index) => [id, player(id.toUpperCase(), index)]),
      );

      await openRoom(storedRoom({ players: crowd }));

      expect(screen.getByText(/played by exactly two people/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /start a new game/i })).toBeInTheDocument();
      expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();
    });

    it('turns away a third player while the second is merely away', async () => {
      // A minute of silence is a person looking at something else, not a person
      // gone: taking the seat then would throw a player out of their own game.
      await openRoom(
        storedRoom({
          players: {
            'owner-uid': player('Vik'),
            'third-uid': player('Cara', 2000, AWAY_AFTER_MS + 5000),
          },
        }),
      );

      expect(screen.getByText(/played by exactly two people/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();
    });
  });

  describe('a seat nobody is sitting in', () => {
    /** A full room whose guest stopped marking themselves present long ago. */
    const roomWithAGhost = () =>
      storedRoom({
        players: {
          'owner-uid': player('Vik'),
          'ghost-uid': player('Ghost', 2000, SEAT_FREE_AFTER_MS + 5000),
        },
      });

    it('offers the nickname form at a room whose second seat was given up', async () => {
      await openRoom(roomWithAGhost());

      expect(screen.getByLabelText(/nickname/i)).toBeInTheDocument();
      expect(screen.queryByText(/played by exactly two people/i)).not.toBeInTheDocument();
    });

    it('takes the seat and fills it in a single write', async () => {
      // Two writes would take the room through a size the security rules
      // refuse, and whichever landed second would be the one turned away.
      await openRoom(roomWithAGhost());

      joinAs('Bob');

      await waitFor(() => expect(gameWrites()).toHaveLength(1));
      expect(Object.keys(gameWriteAt(0))).toEqual([
        'players.guest-uid',
        'players.ghost-uid',
        'expiresAt',
      ]);
    });

    it('never gives up the seat of the player who owns the room', async () => {
      // They are the likeliest to be away — they are off sending the link — and
      // they alone can start the game.
      await openRoom(
        storedRoom({
          players: {
            'owner-uid': player('Vik', 1000, 10 * SEAT_FREE_AFTER_MS),
            'third-uid': player('Cara', 2000),
          },
        }),
      );

      expect(screen.getByText(/played by exactly two people/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();
    });
  });

  describe('when Firebase cannot be reached', () => {
    it('says so when the visitor could not be signed in', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(signInAnonymously).mockRejectedValue(new Error('auth/network-request-failed'));

      renderRoomPage();

      expect(await screen.findByText(/could not reach the game/i)).toBeInTheDocument();
      expect(onSnapshot).not.toHaveBeenCalled();
    });

    it('says so when following the room breaks down', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      renderRoomPage();
      await waitFor(() => expect(onSnapshot).toHaveBeenCalled());

      await act(async () => {
        failSubscription(new Error('Missing or insufficient permissions.'));
      });

      expect(screen.getByText(/could not reach the game/i)).toBeInTheDocument();
    });
  });
});
