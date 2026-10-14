import type { Meta, StoryObj } from '@storybook/react-vite';

import type { RoomDocument } from '../rooms/room-document';
import { RoomInvitePanel } from './RoomInvitePanel';
import { RoomLobby } from './RoomLobby';

const OWNER_ID = 'owner-uid';
const GUEST_ID = 'guest-uid';

/**
 * The link a real room has: the production origin and a 20-character id, 66
 * characters in all, which is the length the invite field is drawn for
 * (issue #199).
 */
const INVITATION = (
  <RoomInvitePanel
    roomId="7pQ2xkNa93TzLm0wYb51"
    origin="https://word-crossword-game-prod.web.app"
  />
);

/** A stand-in for Firestore's `Timestamp`: the lobby reads `toMillis` and nothing else. */
const at = (millis: number) => ({ toMillis: () => millis });

/**
 * A room still waiting in its lobby.
 *
 * @param options.playerCount - How many of the two seats are taken
 * @param options.wordCount - How many words the crossword holds
 * @param options.ownerSilentFor - How long ago the owner last marked themselves present
 */
const lobbyRoom = ({
  playerCount,
  wordCount = 6,
  ownerSilentFor = 0,
}: {
  readonly playerCount: 1 | 2;
  readonly wordCount?: number;
  readonly ownerSilentFor?: number;
}): RoomDocument => {
  const now = Date.now();
  const entries = [
    [OWNER_ID, { nickname: 'Viktor', joinedAt: at(0), lastSeenAt: at(now - ownerSilentFor) }],
    [GUEST_ID, { nickname: 'Olena', joinedAt: at(1), lastSeenAt: at(now) }],
  ] as const;

  return {
    status: 'lobby',
    ownerId: OWNER_ID,
    layout: {
      rows: wordCount,
      cols: 3,
      cells: [],
      placedWords: Array.from({ length: wordCount }, (_word, index) => ({
        word: `word${index}`,
        orientation: 'across' as const,
        cells: [0, 1, 2].map((col) => ({ row: index, col })),
      })),
      unplacedWords: [],
    },
    words: {},
    players: Object.fromEntries(entries.slice(0, playerCount)),
    createdAt: at(0),
    expiresAt: at(now + 86_400_000),
  } as unknown as RoomDocument;
};

/**
 * The lobby: the first screen built out of zones (issue #199). Everything it
 * has stands in the zone on the left, and the middle is left empty on purpose.
 *
 * One story per state a prop drives — the host with room to fill, the host with
 * a full room, a room that cannot be dealt, the guest, and the reader whose own
 * mark has gone stale. The copy result, the deal being written and the deal
 * being refused are state the screen keeps for itself, and are reached by
 * pressing rather than by a prop.
 */
const meta: Meta<typeof RoomLobby> = {
  title: 'Screens/RoomLobby',
  component: RoomLobby,
  args: { roomId: 'room-1', viewerId: OWNER_ID, room: lobbyRoom({ playerCount: 2 }) },
  parameters: { scene: 'doors' },
};

export default meta;

type Story = StoryObj<typeof RoomLobby>;

export const ReadyToStart: Story = {};

export const WaitingForOneMore: Story = {
  args: { room: lobbyRoom({ playerCount: 1 }), invitation: INVITATION },
};

export const MorePlayersThanWords: Story = {
  args: { room: lobbyRoom({ playerCount: 2, wordCount: 1 }) },
};

export const Guest: Story = {
  args: { viewerId: GUEST_ID },
};

export const YouAreAway: Story = {
  args: { room: lobbyRoom({ playerCount: 2, ownerSilentFor: 125_000 }) },
};
