import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { updateDoc } from 'firebase/firestore';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { AWAY_AFTER_MS, PRESENCE_TICK_MS } from '../rooms/presence';
import type { RoomDocument } from '../rooms/room-document';
import { Frame } from './Frame';
import { FrameSlotProvider } from './FrameSlotProvider';
import { RoomLobby } from './RoomLobby';

const ORDER = Node.DOCUMENT_POSITION_FOLLOWING;

// Firebase is the system boundary. This screen owns the write that starts a
// game, so the SDK is mocked away; nothing below asks it to write anything.
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

const OWNER_ID = 'owner-uid';
const GUEST_ID = 'guest-uid';
const PLAYER_IDS = [OWNER_ID, GUEST_ID];

const at = (millis: number) => ({ toMillis: () => millis });

const placed = (word: string, row: number) => ({
  word,
  orientation: 'across' as const,
  cells: [0, 1, 2].map((col) => ({ row, col })),
});

/**
 * A room still waiting in its lobby: nothing has been dealt out, so what is on
 * the screen is what this room tells the player reading it.
 */
const lobbyRoom = ({
  playerCount,
  wordCount = 6,
  unplacedCount = 0,
  silentFor = {},
}: {
  playerCount: number;
  wordCount?: number;
  /** How many of the submitted words did not fit the grid and stayed off it. */
  unplacedCount?: number;
  /** How long ago each player last marked themselves present, by id. */
  silentFor?: Readonly<Record<string, number>>;
}): RoomDocument =>
  ({
    status: 'lobby',
    ownerId: OWNER_ID,
    layout: {
      rows: wordCount,
      cols: 3,
      cells: [],
      placedWords: Array.from({ length: wordCount }, (_word, index) =>
        placed(`word${index}`, index),
      ),
      unplacedWords: Array.from({ length: unplacedCount }, (_word, index) => `unplaced${index}`),
    },
    words: Object.fromEntries(
      Array.from({ length: wordCount }, (_word, index) => [
        `w${index}`,
        { hiddenFromPlayerId: null, guessedByPlayerId: null },
      ]),
    ),
    players: Object.fromEntries(
      PLAYER_IDS.slice(0, playerCount).map((id, index) => [
        id,
        {
          nickname: `Player ${index + 1}`,
          joinedAt: at(index),
          lastSeenAt: at(Date.now() - (silentFor[id] ?? 0)),
        },
      ]),
    ),
    createdAt: at(0),
    expiresAt: at(1_000_000),
  }) as unknown as RoomDocument;

/**
 * The lobby under the frame it is drawn in: the status line is the frame's
 * header, filled by the lobby through `useFrameSlot`.
 */
const renderLobby = (viewerId: string, room: RoomDocument, invitation?: ReactNode) =>
  render(
    <FrameSlotProvider>
      <MemoryRouter>
        <Frame />
      </MemoryRouter>
      <RoomLobby roomId="room-1" room={room} viewerId={viewerId} invitation={invitation} />
    </FrameSlotProvider>,
  );

/** The room's own line about what it is doing, which the header carries. */
const statusLine = (): string =>
  within(screen.getByRole('banner')).getByRole('status').textContent ?? '';

const startButton = () => screen.queryByRole('button', { name: /start the game/i });

describe('RoomLobby', () => {
  it('tells the owner of a room that cannot start yet what is missing, and offers no start', () => {
    renderLobby(OWNER_ID, lobbyRoom({ playerCount: 1 }));

    expect(statusLine()).toBe(
      'A game takes 2 players, so this room needs 1 more before you can start it. Share the room link.',
    );
    // Changed on Viktor's ruling of 2026-09-30 (issue #199): this asserted a
    // start button that was there and disabled. The drawing gives a room one
    // action at a time, copying the link while it waits and starting the game
    // once somebody is in, so a room short of players renders no start at all.
    expect(startButton()).toBeNull();
  });

  it('keeps a start that cannot be pressed when the room has the players and lacks the words', () => {
    // No arrival fixes this one, so it is drawn as the template draws it
    // (`lobby/crowded`) and the status line says which number is wrong.
    renderLobby(OWNER_ID, lobbyRoom({ playerCount: 2, wordCount: 1 }));

    expect(startButton()).toBeDisabled();
  });

  it('stops telling the owner about a wait the moment they can start', () => {
    renderLobby(OWNER_ID, lobbyRoom({ playerCount: 2 }));

    expect(statusLine()).toMatch(/can start now/i);
    expect(statusLine()).not.toMatch(/wait/i);
    // The screen and the button say the same thing — the defect of issue #29
    // was a line about waiting above a button that was ready to be pressed.
    expect(startButton()).toBeEnabled();
  });

  it('tells a guest who starts the game, since they have no control of their own', () => {
    renderLobby(GUEST_ID, lobbyRoom({ playerCount: 2 }));

    expect(statusLine()).toMatch(/the host starts it/i);
    expect(statusLine()).not.toMatch(/needs \d+ more/i);
    expect(startButton()).toBeNull();
    expect(screen.getByText('Waiting for Player 1 to start the game.')).toBeInTheDocument();
  });

  it('tells a guest of a room that cannot start why, rather than leaving them counting', () => {
    // A room of two whose crossword holds a single placed word: the shortest
    // grid the security rules admit, and the only shape this refusal still has
    // now that a room takes two players.
    renderLobby(GUEST_ID, lobbyRoom({ playerCount: 2, wordCount: 1 }));

    expect(statusLine()).toMatch(/the host cannot start this game/i);
    expect(startButton()).toBeNull();
    // Nobody is going to start it, so nobody is told to wait for it.
    expect(screen.queryByText(/waiting for/i)).toBeNull();
  });

  it('counts the words that are in the grid, not the words that were typed in', () => {
    // Nine words went into this room and three of them did not fit, so six are
    // on the board. Nothing says so but this line: an unplaced word is drawn
    // nowhere, and the lobby draws no board.
    renderLobby(GUEST_ID, lobbyRoom({ playerCount: 2, wordCount: 6, unplacedCount: 3 }));

    expect(
      screen.getByText('The crossword: 6 words, half of them for each of you.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/9 words/)).toBeNull();
  });

  it('counts a crossword of one word without a half', () => {
    renderLobby(GUEST_ID, lobbyRoom({ playerCount: 2, wordCount: 1 }));

    expect(screen.getByText('The crossword: 1 word.')).toBeInTheDocument();
    expect(statusLine()).toMatch(/holds 1 word and the room holds 2 players/);
  });

  it('keeps the page named "Lobby" for a reader, without showing the word', () => {
    renderLobby(OWNER_ID, lobbyRoom({ playerCount: 2 }));

    expect(screen.getByRole('heading', { level: 1, name: 'Lobby' })).toBeInTheDocument();
  });

  describe('the drawing', () => {
    it('says the host is alone while nobody has joined', () => {
      renderLobby(OWNER_ID, lobbyRoom({ playerCount: 1 }));

      expect(
        screen.getByRole('img', {
          name: 'Your balcony, and the one across the street still empty',
        }),
      ).toBeInTheDocument();
      expect(screen.getByText('A free seat. Waiting for the second player')).toBeInTheDocument();
    });

    it('says both are in once the second player has joined', () => {
      renderLobby(OWNER_ID, lobbyRoom({ playerCount: 2 }));

      expect(
        screen.getByRole('img', { name: 'Both balconies taken, the line strung between them' }),
      ).toBeInTheDocument();
      expect(screen.queryByText(/a free seat/i)).toBeNull();
    });

    it('draws the curtains across the street for a seat freed by silence, and still offers the start', () => {
      // `invitation` is handed down only while a seat is free: here the guest is
      // in the room, and so is the link.
      renderLobby(
        OWNER_ID,
        lobbyRoom({ playerCount: 2, silentFor: { [GUEST_ID]: 125_000 } }),
        <h2>Invite</h2>,
      );

      expect(
        screen.getByRole('img', {
          name: 'Both balconies taken, the curtains drawn across the street',
        }),
      ).toBeInTheDocument();
      expect(screen.getByText('away for 2 min')).toBeInTheDocument();
      expect(statusLine()).toMatch(/can start now/i);
      expect(screen.getByRole('heading', { name: 'Invite' })).toBeInTheDocument();
      expect(startButton()).toBeEnabled();
    });
  });

  describe('presence', () => {
    // Nothing arrives to say a player has gone quiet, so the screen has to look
    // again — which is the one thing here that needs a clock, and it is moved
    // by hand.
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const passTicks = (count: number) =>
      act(() => {
        vi.advanceTimersByTime(count * PRESENCE_TICK_MS);
      });

    it('says nothing about a player the room is still hearing from', () => {
      renderLobby(OWNER_ID, lobbyRoom({ playerCount: 2 }));

      expect(screen.queryByText(/away for/i)).not.toBeInTheDocument();
    });

    it('says how long a player has been away, beside their name alone', () => {
      renderLobby(OWNER_ID, lobbyRoom({ playerCount: 2, silentFor: { [GUEST_ID]: 125_000 } }));

      expect(screen.getByText('away for 2 min')).toBeInTheDocument();
      expect(screen.getAllByText(/away for/i)).toHaveLength(1);
    });

    it('notices a player going quiet without a snapshot to prompt it', () => {
      // The room does not change: what makes the guest away is a write that
      // never happened, so only the clock can tell the screen about it.
      renderLobby(OWNER_ID, lobbyRoom({ playerCount: 2, silentFor: { [GUEST_ID]: 40_000 } }));

      expect(screen.queryByText(/away for/i)).not.toBeInTheDocument();

      passTicks(2);

      expect(screen.getByText(/away for/i)).toBeInTheDocument();
    });

    it('tells the reader when it is their own mark that has gone stale', () => {
      // Firestore serves this client its own writes from cache, so the screen
      // looks alive to the one person nobody can hear.
      renderLobby(OWNER_ID, lobbyRoom({ playerCount: 2, silentFor: { [OWNER_ID]: 125_000 } }));

      expect(screen.getByText('The room has not heard from you')).toBeInTheDocument();
      expect(screen.getByText(/^not for 2 min\./i)).toBeInTheDocument();
    });

    it('says nothing to a reader the room is still hearing from', () => {
      renderLobby(
        OWNER_ID,
        lobbyRoom({ playerCount: 2, silentFor: { [GUEST_ID]: AWAY_AFTER_MS + 5_000 } }),
      );

      expect(screen.queryByText(/has not heard from you/i)).not.toBeInTheDocument();
    });
  });

  it('states the size a game is played at, not a ceiling to work towards', () => {
    renderLobby(GUEST_ID, lobbyRoom({ playerCount: 2 }));

    expect(screen.getByRole('heading', { name: 'In the room' })).toBeInTheDocument();
    expect(screen.getByText(/played by exactly 2 people/i)).toBeInTheDocument();
    expect(screen.queryByText(/up to|of 4/i)).not.toBeInTheDocument();
  });

  it("lays the column out in the template's order: who is in, the link, the start", () => {
    renderLobby(OWNER_ID, lobbyRoom({ playerCount: 2 }), <h2>Invite</h2>);

    const players = screen.getByRole('heading', { name: 'In the room' });
    const link = screen.getByRole('heading', { name: 'Invite' });
    const start = screen.getByRole('button', { name: /start the game/i });

    expect(players.compareDocumentPosition(link) & ORDER).toBeTruthy();
    expect(link.compareDocumentPosition(start) & ORDER).toBeTruthy();
  });

  it('puts the notice about the reader first in the zone, above who is in', () => {
    renderLobby(OWNER_ID, lobbyRoom({ playerCount: 2, silentFor: { [OWNER_ID]: 125_000 } }));

    const notice = screen.getByText('The room has not heard from you');
    const players = screen.getByRole('heading', { name: 'In the room' });

    expect(notice.closest('[role="status"]')).not.toBeNull();
    expect(notice.compareDocumentPosition(players) & ORDER).toBeTruthy();
  });

  it("says the deal is being written on the button, in the template's words", () => {
    // The write never settles, so the screen stays where pressing left it.
    vi.mocked(updateDoc).mockReturnValueOnce(new Promise(() => undefined));
    renderLobby(OWNER_ID, lobbyRoom({ playerCount: 2 }));

    fireEvent.click(startButton()!);

    expect(screen.getByRole('button', { name: 'Dealing the words' })).toBeDisabled();
  });
});
