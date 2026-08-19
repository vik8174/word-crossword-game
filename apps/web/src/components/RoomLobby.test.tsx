import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AWAY_AFTER_MS, PRESENCE_TICK_MS } from '../rooms/presence';
import type { RoomDocument } from '../rooms/room-document';
import { RoomLobby } from './RoomLobby';

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
  silentFor = {},
}: {
  playerCount: number;
  wordCount?: number;
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
      unplacedWords: [],
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

const renderLobby = (viewerId: string, room: RoomDocument) =>
  render(<RoomLobby roomId="room-1" room={room} viewerId={viewerId} />);

/**
 * The room's own line about what it is doing, which the lobby renders above
 * everything else — the grid below keeps a live region of its own, so the role
 * alone does not name one element.
 */
const statusLine = (): string => screen.getAllByRole('status')[0]?.textContent ?? '';

const startButton = () => screen.queryByRole('button', { name: /start the game/i });

describe('RoomLobby', () => {
  it('tells the owner of a room that cannot start yet what is missing', () => {
    renderLobby(OWNER_ID, lobbyRoom({ playerCount: 1 }));

    expect(statusLine()).toMatch(/needs 1 more\b/);
    expect(statusLine()).toMatch(/share the room link/i);
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

    expect(statusLine()).toMatch(/the host is the one who starts it/i);
    expect(statusLine()).not.toMatch(/needs \d+ more/i);
    expect(startButton()).toBeNull();
  });

  it('tells a guest of a room that cannot start why, rather than leaving them counting', () => {
    // A room of two whose crossword holds a single placed word: the shortest
    // grid the security rules admit, and the only shape this refusal still has
    // now that a room takes two players.
    renderLobby(GUEST_ID, lobbyRoom({ playerCount: 2, wordCount: 1 }));

    expect(statusLine()).toMatch(/the host cannot start this game/i);
    expect(startButton()).toBeNull();
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

      expect(screen.getByText(/the room has not heard from you for 2 min/i)).toBeInTheDocument();
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

    expect(screen.getByRole('heading', { name: /players/i })).toHaveTextContent('Players (2)');
    expect(screen.getByText(/played by exactly 2 people/i)).toBeInTheDocument();
    expect(screen.queryByText(/up to|of 4/i)).not.toBeInTheDocument();
  });
});
