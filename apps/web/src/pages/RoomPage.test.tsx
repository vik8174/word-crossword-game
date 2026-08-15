import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { signInAnonymously } from 'firebase/auth';
import { onSnapshot, updateDoc } from 'firebase/firestore';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ROOM_ROUTE_PATTERN, roomPath } from '../rooms/room-link';
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
}));

const HOUR_MS = 60 * 60 * 1000;

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

const player = (nickname: string, joinedAtMillis = 1000) => ({
  nickname,
  joinedAt: timestamp(joinedAtMillis),
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

  describe('joining', () => {
    it('adds the player to the room under their own auth id', async () => {
      await openRoom();

      joinAs('Bob');

      await waitFor(() =>
        expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
          'players.guest-uid': { nickname: 'Bob', joinedAt: expect.any(Date) },
        }),
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
      await openRoom(roomWithBoth);

      expect(screen.queryByText('Cara')).not.toBeInTheDocument();

      await act(async () => {
        emitRoom({
          exists: () => true,
          data: () =>
            storedRoom({
              players: {
                'owner-uid': player('Vik'),
                'guest-uid': player('Bob', 2000),
                'third-uid': player('Cara', 3000),
              },
            }),
        });
      });

      expect(screen.getByText('Cara')).toBeInTheDocument();
    });

    it('draws the crossword without giving a single letter away', async () => {
      await openRoom(roomWithBoth);

      expect(grid()).toBeInTheDocument();
      expect(grid().textContent).toBe('');
      expect(screen.queryByText(/\bcat\b/i)).not.toBeInTheDocument();
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
      expect(screen.getByText(/needs at least 2 players/i)).toBeInTheDocument();
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

    it('shows a player the words they have to explain', async () => {
      await openRoom(assignedRoom);

      expect(screen.getByText('car')).toBeInTheDocument();
    });

    it('never puts a word hidden from the player anywhere on their screen', async () => {
      await openRoom(assignedRoom);

      expect(screen.queryByText(/\bcat\b/i)).not.toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/\bcat\b/i);
    });

    it('tells a player how many words are theirs to guess, without naming them', async () => {
      await openRoom(assignedRoom);

      expect(screen.getByText(/hidden from you.*: 1\b/i)).toBeInTheDocument();
    });

    it('keeps the grid letterless until a word has been answered', async () => {
      await openRoom(assignedRoom);

      expect(grid().textContent).toBe('');
    });

    it('opens the squares of the words a player has to guess, and only those', async () => {
      await openRoom(assignedRoom);

      // `car` runs down the left column and is Bob's to explain; `cat` runs
      // across the top and is his to guess, so those three squares take letters.
      expect(screen.getAllByLabelText(/a letter of one of your words/i)).toHaveLength(3);
      expect(screen.getByLabelText(/row 1, column 3/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/row 3, column 1/i)).not.toBeInTheDocument();
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

      expect(document.body.textContent).not.toMatch(/\bcat\b|\bcar\b/i);
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

    const spellCat = async () => {
      await act(async () => {
        typeInto(0, 0, 'c');
        typeInto(0, 1, 'a');
        typeInto(0, 2, 't');
      });
    };

    it('writes a right answer down under the answering player, and nothing else', async () => {
      await openRoom(playing());

      await spellCat();

      expect(updateDoc).toHaveBeenCalledExactlyOnceWith(expect.anything(), {
        'words.w0.guessedByPlayerId': 'guest-uid',
      });
    });

    it('keeps a wrong answer to the player who made it', async () => {
      await openRoom(playing());

      await act(async () => {
        typeInto(0, 0, 'b');
        typeInto(0, 1, 'a');
        typeInto(0, 2, 't');
      });

      expect(updateDoc).not.toHaveBeenCalled();
      expect(screen.getByText(/not the word/i)).toBeInTheDocument();
    });

    it('fills the grid in for a player who answered nothing, without a reload', async () => {
      await openRoom(playing());
      expect(grid().textContent).toBe('');

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

      // `car` was Vik's to answer, and its letters are now on Bob's board too —
      // including the `C` his own `cat` starts with.
      expect(grid().textContent).toBe('CAR');
      expect(screen.queryByLabelText(/row 1, column 1\b/i)).not.toBeInTheDocument();
    });

    it('locks the squares of a word once it has been answered', async () => {
      await openRoom(
        playing({
          w0: { hiddenFromPlayerId: 'guest-uid', guessedByPlayerId: 'guest-uid' },
          w1: { hiddenFromPlayerId: 'owner-uid', guessedByPlayerId: null },
        }),
      );

      expect(grid().textContent).toBe('CAT');
      expect(screen.queryByLabelText(/a letter of one of your words/i)).not.toBeInTheDocument();
      expect(screen.getByText(/hidden from you.*: 1, of which 1 answered/i)).toBeInTheDocument();
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
      // nothing left to explain, and the chip says so rather than only the grid.
      expect(screen.getByLabelText('car — answered')).toBeInTheDocument();
    });

    it('fills two of a player own crossing words without the cursor going astray', async () => {
      // `cat` across and `car` down are both Bob's, sharing the top-left
      // square. Starting on that square gives him the across word; the space
      // bar turns him down it, and the letters follow him rather than the grid.
      await openRoom(
        storedRoom({
          status: 'playing',
          layout: CROSSING_LAYOUT,
          players: { 'owner-uid': player('Vik'), 'guest-uid': player('Bob', 2000) },
          words: {
            w0: { hiddenFromPlayerId: 'guest-uid', guessedByPlayerId: null },
            w1: { hiddenFromPlayerId: 'guest-uid', guessedByPlayerId: null },
            w2: { hiddenFromPlayerId: 'owner-uid', guessedByPlayerId: null },
          },
        }),
      );

      const shared = screen.getByLabelText(/row 1, column 1\b/i);

      await act(async () => shared.focus());
      expect(shared).toHaveAccessibleName(/filled across, where two of them cross/i);

      await act(async () => {
        fireEvent.keyDown(shared, { key: ' ' });
      });
      expect(shared).toHaveAccessibleName(/filled down/i);

      await act(async () => {
        typeInto(0, 0, 'c');
        typeInto(1, 0, 'a');
        typeInto(2, 0, 'r');
      });

      expect(updateDoc).toHaveBeenCalledExactlyOnceWith(expect.anything(), {
        'words.w1.guessedByPlayerId': 'guest-uid',
      });
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

      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('closes the game the moment the room shows every word answered', async () => {
      await openRoom(withWords({ w0: catAnswered, w1: carOpen }));

      await emit(withWords({ w0: catAnswered, w1: carAnswered }));

      expect(updateDoc).toHaveBeenCalledExactlyOnceWith(expect.anything(), {
        status: 'completed',
      });
    });

    it('closes it from the room that arrived, not from the answer this player sent', async () => {
      // The trap this ticket turns on. Bob answers `cat` while Vik answers `car`
      // in the same second: neither of them, looking at the room they answered
      // in, was the last one. Read that way, nobody would ever close the game
      // and a full grid would sit in `playing` for good.
      await openRoom(withWords({ w0: open, w1: carOpen }));

      await act(async () => {
        typeInto(0, 0, 'c');
        typeInto(0, 1, 'a');
        typeInto(0, 2, 't');
      });

      expect(updateDoc).toHaveBeenCalledExactlyOnceWith(expect.anything(), {
        'words.w0.guessedByPlayerId': 'guest-uid',
      });

      await emit(withWords({ w0: catAnswered, w1: carAnswered }));

      expect(updateDoc).toHaveBeenLastCalledWith(expect.anything(), { status: 'completed' });
      expect(updateDoc).toHaveBeenCalledTimes(2);
    });

    it('writes the finished status once, however many snapshots follow', async () => {
      const finished = withWords({ w0: catAnswered, w1: carAnswered });

      await openRoom(finished);
      await emit(finished);
      await emit(withWords({ w0: catAnswered, w1: carAnswered }, 'completed'));

      expect(updateDoc).toHaveBeenCalledOnce();
    });

    it('writes nothing more once the room already says the game is over', async () => {
      await openRoom(withWords({ w0: catAnswered, w1: carAnswered }, 'completed'));

      expect(updateDoc).not.toHaveBeenCalled();
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
      await openRoom(withWords({ w0: open, w1: carOpen }, 'completed'));

      expect(document.body.textContent).not.toMatch(/\bcat\b|\bcar\b/i);
      expect(screen.queryByText(/every word is in/i)).not.toBeInTheDocument();
      expect(screen.getByText(/this room is closed/i)).toBeInTheDocument();
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

    it('turns away a fifth player', async () => {
      const crowd = Object.fromEntries(
        ['a', 'b', 'c', 'd'].map((id, index) => [id, player(id.toUpperCase(), index)]),
      );

      await openRoom(storedRoom({ players: crowd }));

      expect(screen.getByText(/already full/i)).toBeInTheDocument();
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
