import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ReactNode, useEffect } from 'react';

import type { RoomDocument } from '../rooms/room-document';
import { Frame } from './Frame';
import { FrameSlotProvider } from './FrameSlotProvider';
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
 * @param options.silentFor - How long ago each player last marked themselves present, by id
 */
const lobbyRoom = ({
  playerCount,
  wordCount = 6,
  silentFor = {},
}: {
  readonly playerCount: 1 | 2;
  readonly wordCount?: number;
  readonly silentFor?: Readonly<Record<string, number>>;
}): RoomDocument => {
  const now = Date.now();
  const entries = [
    [
      OWNER_ID,
      { nickname: 'Viktor', joinedAt: at(0), lastSeenAt: at(now - (silentFor[OWNER_ID] ?? 0)) },
    ],
    [
      GUEST_ID,
      { nickname: 'Olena', joinedAt: at(1), lastSeenAt: at(now - (silentFor[GUEST_ID] ?? 0)) },
    ],
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
 * Presses the first button called `name` once the story is on the page: the
 * workshop's way to reach a state that only pressing reaches (the copy result,
 * the deal under way, the deal refused).
 */
const PressOnMount = ({
  name,
  children,
}: {
  readonly name: string;
  readonly children: ReactNode;
}) => {
  useEffect(() => {
    const button = [...document.querySelectorAll('button')].find(
      (candidate) => candidate.textContent === name,
    );
    button?.click();
  }, [name]);

  return children;
};

/** The deal's write that never settles: the screen stays mid-deal. */
const dealNeverSettles = () => new Promise<void>(() => undefined);

/** The deal's write that the database refuses. */
const dealRefused = () => Promise.reject(new Error('refused'));

/**
 * The lobby under the frame it stands in: the status line is the frame's
 * header, filled by the lobby, and shows from 768 up.
 */
const meta: Meta<typeof RoomLobby> = {
  title: 'Screens/RoomLobby',
  component: RoomLobby,
  args: { roomId: 'room-1', viewerId: OWNER_ID, room: lobbyRoom({ playerCount: 2 }) },
  decorators: [
    (Story) => (
      <FrameSlotProvider>
        <Frame />
        <Story />
      </FrameSlotProvider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof RoomLobby>;

/** `lobby`, the host's: both in, the start offered. */
export const ReadyToStart: Story = {};

/** `lobby`, the guest's: both in, and the line that names who starts. */
export const Guest: Story = {
  args: { viewerId: GUEST_ID },
};

/** `lobby/waiting`, the host's: alone, with the link to send. */
export const WaitingForOneMore: Story = {
  args: { room: lobbyRoom({ playerCount: 1 }), invitation: INVITATION },
};

/** `lobby/copied`: the copy went through. */
export const LinkCopied: Story = {
  args: { room: lobbyRoom({ playerCount: 1 }), invitation: INVITATION },
  decorators: [
    (Story) => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.resolve() },
      });

      return (
        <PressOnMount name="Copy link">
          <Story />
        </PressOnMount>
      );
    },
  ],
};

/** `lobby/copyfailed`: the browser refused the clipboard. */
export const CopyRefused: Story = {
  args: { room: lobbyRoom({ playerCount: 1 }), invitation: INVITATION },
  decorators: [
    (Story) => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.reject(new Error('denied')) },
      });

      return (
        <PressOnMount name="Copy link">
          <Story />
        </PressOnMount>
      );
    },
  ],
};

/** `lobby/crowded`, the host's: a crossword of one word for two players. */
export const MorePlayersThanWords: Story = {
  args: { room: lobbyRoom({ playerCount: 2, wordCount: 1 }) },
};

/** `lobby/crowded`, the guest's. */
export const GuestMorePlayersThanWords: Story = {
  args: { viewerId: GUEST_ID, room: lobbyRoom({ playerCount: 2, wordCount: 1 }) },
};

/** `lobby/starting`: the start pressed, the deal under way. */
export const Dealing: Story = {
  args: { deal: dealNeverSettles },
  decorators: [
    (Story) => (
      <PressOnMount name="Start the game">
        <Story />
      </PressOnMount>
    ),
  ],
};

/** `lobby/failed`: the deal refused, nothing dealt out, the start still live. */
export const DealRefused: Story = {
  args: { deal: dealRefused },
  decorators: [
    (Story) => (
      <PressOnMount name="Start the game">
        <Story />
      </PressOnMount>
    ),
  ],
};

/** `lobby/away`: this reader's own mark has gone stale. */
export const YouAreAway: Story = {
  args: { room: lobbyRoom({ playerCount: 2, silentFor: { [OWNER_ID]: 125_000 } }) },
};

/** `lobby/away`, the guest's. */
export const GuestYouAreAway: Story = {
  args: {
    viewerId: GUEST_ID,
    room: lobbyRoom({ playerCount: 2, silentFor: { [GUEST_ID]: 125_000 } }),
  },
};

/**
 * A seat freed by silence: two players in, the second silent past the point the
 * seat is let go (60 s). The host sees the ready status, the invite panel and
 * the start together; the curtains of the second balcony are drawn.
 */
export const SeatFreedBySilence: Story = {
  args: {
    room: lobbyRoom({ playerCount: 2, silentFor: { [GUEST_ID]: 125_000 } }),
    invitation: INVITATION,
  },
};
