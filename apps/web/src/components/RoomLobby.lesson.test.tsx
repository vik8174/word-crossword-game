import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import type { RoomDocument } from '../rooms/room-document';
import { Frame } from './Frame';
import { FrameSlotProvider } from './FrameSlotProvider';
import { RoomInvitePanel } from './RoomInvitePanel';
import { RoomLobby } from './RoomLobby';

// Firebase is the system boundary. The lobby owns the deal, and every test here
// either hands it a deal of its own or never presses it.
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
  deleteField: vi.fn(() => ({ field: 'deleted' })),
}));

/**
 * The lobby of a lesson, as the teacher and as each student read it
 * (`design/templates/state-tree.html` with `mode=lesson`, lines 924-977). The
 * pair game's lobby is `RoomLobby.test.tsx`, which this file leaves alone.
 */

const TEACHER_ID = 'teacher-uid';
const OLENA_ID = 'olena-uid';
const TARAS_ID = 'taras-uid';

const CLAUSE = ', and the teacher watching from the house at the end of the street';

const at = (millis: number) => ({ toMillis: () => millis });

const placed = (word: string, row: number) => ({
  word,
  orientation: 'across' as const,
  cells: [0, 1, 2].map((col) => ({ row, col })),
});

/** A lesson still waiting in its lobby, with the marks `silentFor` makes old, by UID. */
const lesson = ({
  students,
  wordCount = 6,
  silentFor = {},
}: {
  readonly students: 0 | 1 | 2;
  readonly wordCount?: number;
  readonly silentFor?: Readonly<Record<string, number>>;
}): RoomDocument => {
  const now = Date.now();
  const seen = (id: string) => at(now - (silentFor[id] ?? 0));

  return {
    status: 'lobby',
    mode: 'lesson',
    ownerId: TEACHER_ID,
    teacher: { nickname: 'Carmen', lastSeenAt: seen(TEACHER_ID) },
    layout: {
      rows: wordCount,
      cols: 3,
      cells: [],
      placedWords: Array.from({ length: wordCount }, (_word, index) =>
        placed(`word${index}`, index),
      ),
      unplacedWords: [],
    },
    words: {},
    players: Object.fromEntries(
      [
        [OLENA_ID, { nickname: 'Olena', joinedAt: at(1), lastSeenAt: seen(OLENA_ID) }],
        [TARAS_ID, { nickname: 'Taras', joinedAt: at(2), lastSeenAt: seen(TARAS_ID) }],
      ].slice(0, students),
    ),
    createdAt: at(0),
    expiresAt: at(now + 86_400_000),
  } as unknown as RoomDocument;
};

const INVITATION = <RoomInvitePanel roomId="room-1" origin="https://example.test" isLesson />;

const renderLobby = (
  viewerId: string,
  room: RoomDocument,
  extra: { invitation?: ReactNode; deal?: () => Promise<void> } = {},
) =>
  render(
    <FrameSlotProvider>
      <MemoryRouter>
        <Frame />
      </MemoryRouter>
      <RoomLobby roomId="room-1" room={room} viewerId={viewerId} {...extra} />
    </FrameSlotProvider>,
  );

const statusLine = (): string =>
  within(screen.getByRole('banner')).getByRole('status').textContent ?? '';

/** The rows of "In the room", each as the text a reader gets from it. */
const rows = (): string[] =>
  within(screen.getByRole('region', { name: 'In the room' }))
    .getAllByRole('listitem')
    .map((row) => row.textContent ?? '');

const dealButton = () => screen.queryByRole('button', { name: 'Deal the words' });

describe("a lesson's lobby, for its teacher", () => {
  it('shows the first lobby: both seats free, the teacher’s own row first, and the invitation worded for two', () => {
    renderLobby(TEACHER_ID, lesson({ students: 0 }), { invitation: INVITATION });

    expect(statusLine()).toBe(
      'A lesson takes 2 players, so this room needs 2 more before you can start it. Share the room link.',
    );
    expect(rows()).toEqual([
      'Carmenteacher, you',
      'A free seat. Waiting for the first player',
      'A free seat. Waiting for the second player',
    ]);
    expect(
      screen.getByText(
        'Send this link to both of your players. They join with a nickname, no sign-up.',
      ),
    ).toBeInTheDocument();
    expect(dealButton()).toBeNull();
  });

  it('shows a lobby with one student in: the second seat is the free one', () => {
    renderLobby(TEACHER_ID, lesson({ students: 1 }), { invitation: INVITATION });

    expect(statusLine()).toMatch(/needs 1 more before you can start it/);
    expect(rows()).toEqual([
      'Carmenteacher, you',
      'Olena',
      'A free seat. Waiting for the second player',
    ]);
    expect(dealButton()).toBeNull();
  });

  it('shows a lobby with both students in, and offers the deal under its own name', () => {
    renderLobby(TEACHER_ID, lesson({ students: 2 }));

    expect(statusLine()).toBe('Both players are here. The lesson can start now.');
    expect(rows()).toEqual(['Carmenteacher, you', 'Olena', 'Taras']);
    expect(dealButton()).toBeEnabled();
    expect(screen.queryByRole('button', { name: /start the game/i })).toBeNull();
  });

  it('says to the teacher that they deal the words and do not play', () => {
    renderLobby(TEACHER_ID, lesson({ students: 2 }));

    expect(
      screen.getByText(
        'A lesson is played by 2 players. You deal the words and watch; you do not play.',
      ),
    ).toBeInTheDocument();
  });

  it('deals with the two students in the room, and says so on the button while it is written', async () => {
    let finish: () => void = () => undefined;
    const deal = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const room = lesson({ students: 2 });
    renderLobby(TEACHER_ID, room, { deal });

    fireEvent.click(screen.getByRole('button', { name: 'Deal the words' }));

    expect(deal).toHaveBeenCalledWith({ roomId: 'room-1', room });
    expect(screen.getByRole('button', { name: 'Dealing the words' })).toBeInTheDocument();

    await act(async () => finish());
  });

  it('says a refused deal in the pair game’s words, and keeps the control live', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderLobby(TEACHER_ID, lesson({ students: 2 }), {
      deal: () => Promise.reject(new Error('no')),
    });

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Deal the words' })));

    expect(screen.getByRole('alert')).toHaveTextContent('Could not start the game');
    expect(dealButton()).toBeEnabled();
  });

  it('counts the crossword for each player, and not for "you"', () => {
    renderLobby(TEACHER_ID, lesson({ students: 2 }));

    expect(
      screen.getByText('The crossword: 6 words, half of them for each player.'),
    ).toBeInTheDocument();
  });

  it('says nobody can start a lesson whose crossword is shorter than its room, and keeps the deal disabled', () => {
    renderLobby(TEACHER_ID, lesson({ students: 2, wordCount: 1 }));

    expect(statusLine()).toMatch(/This game cannot start\. Create a new room/);
    expect(dealButton()).toBeDisabled();
  });

  describe('the drawing', () => {
    it.each([
      [0, `Both balconies still empty${CLAUSE}`],
      [1, `One balcony taken, the other still empty${CLAUSE}`],
      [2, `Both balconies taken, the line strung between them${CLAUSE}`],
    ] as const)('is named for a lobby with %i students in', (students, label) => {
      renderLobby(TEACHER_ID, lesson({ students }));

      expect(screen.getByRole('img', { name: label })).toBeInTheDocument();
    });

    it('draws the curtains of a seat freed by silence while the link is still offered', () => {
      renderLobby(TEACHER_ID, lesson({ students: 2, silentFor: { [TARAS_ID]: 125_000 } }), {
        invitation: INVITATION,
      });

      expect(
        screen.getByRole('img', {
          name: `Both balconies taken, the curtains drawn across the street${CLAUSE}`,
        }),
      ).toBeInTheDocument();
    });

    it('puts a neighbour on the balcony of every student, and none on an empty one', () => {
      const { container, rerender } = renderLobby(TEACHER_ID, lesson({ students: 0 }));
      const people = () => container.querySelectorAll('svg .who').length;

      // The teacher alone, at the end of the street.
      expect(people()).toBe(1);

      rerender(
        <FrameSlotProvider>
          <MemoryRouter>
            <Frame />
          </MemoryRouter>
          <RoomLobby roomId="room-1" room={lesson({ students: 1 })} viewerId={TEACHER_ID} />
        </FrameSlotProvider>,
      );
      expect(people()).toBe(2);
    });
  });

  describe('when the room has not heard from them', () => {
    const silent = { [TEACHER_ID]: 125_000 };

    it('says so in a notice first in the column, and marks their own row away', () => {
      renderLobby(TEACHER_ID, lesson({ students: 2, silentFor: silent }));

      expect(screen.getByText('The room has not heard from you')).toBeInTheDocument();
      expect(rows()[0]).toBe('Carmenteacher, youaway for 2 min');
    });

    it('still draws the teacher at their window, with the clause: the notice says it, in words', () => {
      renderLobby(TEACHER_ID, lesson({ students: 2, silentFor: silent }));

      expect(
        screen.getByRole('img', {
          name: `Both balconies taken, the line strung between them${CLAUSE}`,
        }),
      ).toBeInTheDocument();
    });

    it('does not tell the teacher that the teacher is away, which is what a student is told', () => {
      renderLobby(TEACHER_ID, lesson({ students: 2, silentFor: silent }));

      expect(screen.queryByText('Carmen is away')).toBeNull();
    });
  });
});

describe("a lesson's lobby, for a student", () => {
  it('tells them who starts the lesson while the other seat is free', () => {
    renderLobby(OLENA_ID, lesson({ students: 1 }));

    expect(statusLine()).toBe(
      'A lesson takes 2 players, so this room needs 1 more. Carmen starts the game once they are in.',
    );
    expect(rows()).toEqual([
      'Carmenteacher',
      'Olenayou',
      'A free seat. Waiting for the second player',
    ]);
  });

  it('shows the lobby with both in, with no control of their own and the teacher named', () => {
    renderLobby(TARAS_ID, lesson({ students: 2 }));

    expect(statusLine()).toBe(
      'Both players are here. Carmen starts the lesson, and it begins on this screen the moment they do.',
    );
    expect(rows()).toEqual(['Carmenteacher', 'Olena', 'Tarasyou']);
    expect(dealButton()).toBeNull();
    expect(screen.getByText('Waiting for Carmen to start the game.')).toBeInTheDocument();
    expect(
      screen.getByText(
        'A lesson is played by 2 players. Carmen, the teacher, deals the words and watches.',
      ),
    ).toBeInTheDocument();
  });

  it('is never offered the link, which is the teacher’s to give', () => {
    renderLobby(OLENA_ID, lesson({ students: 1 }));

    expect(screen.queryByRole('textbox', { name: 'Invite link' })).toBeNull();
  });

  describe('the drawing', () => {
    it('names their own balcony while the other is empty, with the teacher once', () => {
      renderLobby(OLENA_ID, lesson({ students: 1 }));

      expect(
        screen.getByRole('img', {
          name: `Your balcony, and the one across the street still empty${CLAUSE}`,
        }),
      ).toBeInTheDocument();
    });

    it('says both are taken with two in', () => {
      renderLobby(OLENA_ID, lesson({ students: 2 }));

      expect(
        screen.getByRole('img', {
          name: `Both balconies taken, the line strung between them${CLAUSE}`,
        }),
      ).toBeInTheDocument();
    });
  });

  describe('when the teacher is away', () => {
    const away = { [TEACHER_ID]: 185_000 };

    it('tells them so, by name and for how long, and that only the teacher can start', () => {
      renderLobby(OLENA_ID, lesson({ students: 2, silentFor: away }));

      expect(screen.getByText('Carmen is away')).toBeInTheDocument();
      expect(
        screen.getByText(
          'The room has not heard from your teacher for 3 min. Only the teacher can start a lesson, so it waits here until they are back.',
        ),
      ).toBeInTheDocument();
    });

    it('marks the teacher’s row away and says in the header that only they can start it', () => {
      renderLobby(OLENA_ID, lesson({ students: 2, silentFor: away }));

      expect(rows()[0]).toBe('Carmenteacheraway for 3 min');
      expect(statusLine()).toBe('Both players are here. Only Carmen can start the lesson.');
    });

    it('no longer says they are waiting for the teacher to start', () => {
      renderLobby(OLENA_ID, lesson({ students: 2, silentFor: away }));

      expect(screen.queryByText(/Waiting for Carmen/)).toBeNull();
    });

    it('draws the curtains and leaves the clause out of the label', () => {
      renderLobby(OLENA_ID, lesson({ students: 2, silentFor: away }));

      expect(
        screen.getByRole('img', { name: 'Both balconies taken, the line strung between them' }),
      ).toBeInTheDocument();
    });

    it('tells them with one student in too, and leaves the waiting line alone', () => {
      renderLobby(OLENA_ID, lesson({ students: 1, silentFor: away }));

      expect(screen.getByText('Carmen is away')).toBeInTheDocument();
      expect(statusLine()).toMatch(/needs 1 more\. Carmen starts the game/);
    });

    it('notices the teacher going quiet without a snapshot to prompt it', () => {
      vi.useFakeTimers();

      try {
        const now = Date.now();
        const room = lesson({ students: 2 });
        // The mark is 40 s old now, and 45 s is the threshold: a few ticks cross it.
        const stale = {
          ...room,
          teacher: { nickname: 'Carmen', lastSeenAt: at(now - 40_000) },
        } as unknown as RoomDocument;
        renderLobby(OLENA_ID, stale);
        expect(screen.queryByText('Carmen is away')).toBeNull();

        act(() => {
          vi.advanceTimersByTime(10_000);
        });

        expect(screen.getByText('Carmen is away')).toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  it('tells them, when it is their own mark that went stale, that the room has not heard from them', () => {
    renderLobby(OLENA_ID, lesson({ students: 2, silentFor: { [OLENA_ID]: 125_000 } }));

    expect(screen.getByText('The room has not heard from you')).toBeInTheDocument();
    expect(rows()[1]).toBe('Olenayouaway for 2 min');
  });
});
