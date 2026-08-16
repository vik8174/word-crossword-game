import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { RoomDocument } from '../rooms/room-document';
import { RoomBoard } from './RoomBoard';

const OWNER_ID = 'owner-uid';
const GUEST_ID = 'guest-uid';
const PLAYER_IDS = [OWNER_ID, GUEST_ID, 'third-uid', 'fourth-uid'];

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
}: {
  playerCount: number;
  wordCount?: number;
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
        { nickname: `Player ${index + 1}`, joinedAt: at(index) },
      ]),
    ),
    createdAt: at(0),
    expiresAt: at(1_000_000),
  }) as unknown as RoomDocument;

const renderBoard = (viewerId: string, room: RoomDocument) =>
  render(
    <RoomBoard
      room={room}
      viewerId={viewerId}
      onStartGame={vi.fn()}
      isStartingGame={false}
      onSolveWord={vi.fn().mockResolvedValue(undefined)}
    />,
  );

/**
 * The room's own line about what it is doing, which the board renders above
 * everything else — the grid below keeps a live region of its own, so the role
 * alone does not name one element.
 */
const statusLine = (): string => screen.getAllByRole('status')[0]?.textContent ?? '';

const startButton = () => screen.queryByRole('button', { name: /start the game/i });

describe('RoomBoard in a lobby', () => {
  it('tells the owner of a room that cannot start yet what is missing', () => {
    renderBoard(OWNER_ID, lobbyRoom({ playerCount: 1 }));

    expect(statusLine()).toMatch(/needs 1 more\b/);
    expect(statusLine()).toMatch(/share the room link/i);
    expect(startButton()).toBeDisabled();
  });

  it('stops telling the owner about a wait the moment they can start', () => {
    renderBoard(OWNER_ID, lobbyRoom({ playerCount: 2 }));

    expect(statusLine()).toMatch(/can start now/i);
    expect(statusLine()).not.toMatch(/wait/i);
    // The screen and the button say the same thing — the defect of issue #29
    // was a line about waiting above a button that was ready to be pressed.
    expect(startButton()).toBeEnabled();
  });

  it('tells a guest who starts the game, since they have no control of their own', () => {
    renderBoard(GUEST_ID, lobbyRoom({ playerCount: 2 }));

    expect(statusLine()).toMatch(/the host is the one who starts it/i);
    expect(statusLine()).not.toMatch(/needs \d+ more/i);
    expect(startButton()).toBeNull();
  });

  it('tells a guest of a room that cannot start why, rather than leaving them counting', () => {
    renderBoard(GUEST_ID, lobbyRoom({ playerCount: 3, wordCount: 2 }));

    expect(statusLine()).toMatch(/the host cannot start this game/i);
    expect(startButton()).toBeNull();
  });

  it('shows the room filling up without reading as a count towards four', () => {
    renderBoard(GUEST_ID, lobbyRoom({ playerCount: 2 }));

    expect(screen.getByRole('heading', { name: /players/i })).toHaveTextContent('Players (2)');
    expect(screen.getByText(/holds up to 4 players/i)).toBeInTheDocument();
  });
});
