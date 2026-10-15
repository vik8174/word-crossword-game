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

// ---------------------------------------------------------------------------
// A lesson's lobby (`?mode=lesson` of the template, lines 924-977).
//
// The teacher is the room's owner and stands in no entry of `players`; the seats
// are the students'. One story for every (state, role) pair the issue builds:
// the teacher's and a student's `lobby`, `lobby/waiting`, `lobby/starting` and
// `lobby/away`, the teacher's `lobby/nostudent` and a student's
// `lobby/teacheraway`.
// ---------------------------------------------------------------------------

const TEACHER_ID = 'teacher-uid';
const OLENA_ID = 'olena-uid';
const TARAS_ID = 'taras-uid';

/** The invitation of a lesson, worded for both of the teacher's students. */
const LESSON_INVITATION = (
  <RoomInvitePanel
    roomId="7pQ2xkNa93TzLm0wYb51"
    origin="https://word-crossword-game-prod.web.app"
    isLesson
  />
);

/**
 * A lesson still waiting in its lobby.
 *
 * @param options.students - How many of the two seats are taken
 * @param options.silentFor - How long ago each person last marked themselves present, by id
 */
const lessonLobbyRoom = ({
  students,
  silentFor = {},
}: {
  readonly students: 0 | 1 | 2;
  readonly silentFor?: Readonly<Record<string, number>>;
}): RoomDocument => {
  const now = Date.now();
  const seen = (id: string) => at(now - (silentFor[id] ?? 0));
  const entries = [
    [OLENA_ID, { nickname: 'Olena', joinedAt: at(1), lastSeenAt: seen(OLENA_ID) }],
    [TARAS_ID, { nickname: 'Taras', joinedAt: at(2), lastSeenAt: seen(TARAS_ID) }],
  ] as const;

  return {
    ...lobbyRoom({ playerCount: 1 }),
    mode: 'lesson',
    ownerId: TEACHER_ID,
    teacher: { nickname: 'Carmen', lastSeenAt: seen(TEACHER_ID) },
    players: Object.fromEntries(entries.slice(0, students)),
  } as unknown as RoomDocument;
};

/** `lobby` of a lesson, the teacher's: both students in, "Deal the words" offered. */
export const LessonTeacherReady: Story = {
  args: { viewerId: TEACHER_ID, room: lessonLobbyRoom({ students: 2 }) },
};

/** `lobby` of a lesson, a student's: both in, and the line that names who deals. */
export const LessonStudentReady: Story = {
  args: { viewerId: OLENA_ID, room: lessonLobbyRoom({ students: 2 }) },
};

/** `lobby/nostudent`: the teacher's first lobby. Both seats free, the link to send. */
export const LessonTeacherNoStudent: Story = {
  args: {
    viewerId: TEACHER_ID,
    room: lessonLobbyRoom({ students: 0 }),
    invitation: LESSON_INVITATION,
  },
};

/** `lobby/waiting` of a lesson, the teacher's: one student in, one seat free. */
export const LessonTeacherWaiting: Story = {
  args: {
    viewerId: TEACHER_ID,
    room: lessonLobbyRoom({ students: 1 }),
    invitation: LESSON_INVITATION,
  },
};

/** `lobby/waiting` of a lesson, the student's: alone with the teacher, one seat free. */
export const LessonStudentWaiting: Story = {
  args: { viewerId: OLENA_ID, room: lessonLobbyRoom({ students: 1 }) },
};

/** `lobby/starting` of a lesson, the teacher's: the deal pressed, under way. */
export const LessonTeacherDealing: Story = {
  args: { viewerId: TEACHER_ID, room: lessonLobbyRoom({ students: 2 }), deal: dealNeverSettles },
  decorators: [
    (Story) => (
      <PressOnMount name="Deal the words">
        <Story />
      </PressOnMount>
    ),
  ],
};

/**
 * `lobby/starting` of a lesson, the student's. A student has no control to
 * press, so the screen they see while the teacher deals is `LessonStudentReady`:
 * the room they are in does not change until the deal lands.
 */
export const LessonStudentWhileDealing: Story = {
  args: { viewerId: OLENA_ID, room: lessonLobbyRoom({ students: 2 }) },
};

/**
 * `lobby/away` of a lesson, the teacher's: their own mark is old. The notice, the
 * hollow ring on their own row and "away for 2 min"; the teacher is still drawn
 * at their window, since the drawing is the students'.
 */
export const LessonTeacherYouAreAway: Story = {
  args: {
    viewerId: TEACHER_ID,
    room: lessonLobbyRoom({ students: 2, silentFor: { [TEACHER_ID]: 125_000 } }),
  },
};

/** `lobby/away` of a lesson, a student's: their own mark is old. */
export const LessonStudentYouAreAway: Story = {
  args: {
    viewerId: OLENA_ID,
    room: lessonLobbyRoom({ students: 2, silentFor: { [OLENA_ID]: 125_000 } }),
  },
};

/**
 * `lobby/teacheraway`: a student's lobby whose teacher has gone quiet. The
 * notice names the teacher and says only they can start; the teacher's balcony
 * has its curtains drawn.
 */
export const LessonTeacherAway: Story = {
  args: {
    viewerId: OLENA_ID,
    room: lessonLobbyRoom({ students: 2, silentFor: { [TEACHER_ID]: 185_000 } }),
  },
};

/** A seat freed by silence in a lesson: the teacher sees the curtains and still holds the link. */
export const LessonSeatFreedBySilence: Story = {
  args: {
    viewerId: TEACHER_ID,
    room: lessonLobbyRoom({ students: 2, silentFor: { [TARAS_ID]: 125_000 } }),
    invitation: LESSON_INVITATION,
  },
};
