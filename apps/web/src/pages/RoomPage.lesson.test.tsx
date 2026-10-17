import { ThemeProvider } from '@mui/material/styles';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { type Analytics, initializeAnalytics, isSupported } from 'firebase/analytics';
import { FirebaseError } from 'firebase/app';
import { signInAnonymously } from 'firebase/auth';
import { onSnapshot, updateDoc } from 'firebase/firestore';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Frame } from '../components/Frame';
import { FrameSlotProvider } from '../components/FrameSlotProvider';
import { AWAY_AFTER_MS } from '../rooms/presence';
import { ROOM_ROUTE_PATTERN, roomPath } from '../rooms/room-link';
import { theme } from '../theme';
import { RoomPage } from './RoomPage';

// Firebase is the system boundary: mocked so a teacher and two students can be
// walked through the lesson's first half without a project. Everything above it
// — the access rules, the document guard, the screens — runs for real.
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
vi.mock('firebase/analytics', () => ({
  initializeAnalytics: vi.fn(),
  isSupported: vi.fn(),
  logEvent: vi.fn(),
  setDefaultEventParameters: vi.fn(),
}));

/**
 * A lesson's first half, through the room screen: the teacher in their own room
 * in every state, two students joining by one link, the third turned away, and
 * the deal. A pair game's half is `RoomPage.test.tsx`, which this file leaves
 * alone.
 */

const HOUR_MS = 60 * 60 * 1000;
const TEACHER_ID = 'teacher-uid';
const OLENA_ID = 'olena-uid';
const TARAS_ID = 'taras-uid';
const STRANGER_ID = 'stranger-uid';

const timestamp = (millis: number) => ({ toMillis: () => millis });

const LAYOUT = {
  rows: 3,
  cols: 3,
  cells: [
    { row: 0, col: 0, letter: 'C' },
    { row: 0, col: 1, letter: 'A' },
    { row: 0, col: 2, letter: 'T' },
    { row: 1, col: 0, letter: 'A' },
    { row: 2, col: 0, letter: 'R' },
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

const student = (nickname: string, joinedAtMillis: number) => ({
  nickname,
  joinedAt: timestamp(joinedAtMillis),
  lastSeenAt: timestamp(Date.now()),
});

/** A lesson as Firestore hands it back: alive, the teacher at their window unless told otherwise. */
const storedLesson = (
  students: Record<string, ReturnType<typeof student>> = {},
  overrides: Record<string, unknown> = {},
) => ({
  status: 'lobby',
  mode: 'lesson',
  ownerId: TEACHER_ID,
  teacher: { nickname: 'Carmen', lastSeenAt: timestamp(Date.now()) },
  layout: LAYOUT,
  words: {
    w0: { hiddenFromPlayerId: null, guessedByPlayerId: null },
    w1: { hiddenFromPlayerId: null, guessedByPlayerId: null },
  },
  players: students,
  createdAt: timestamp(Date.now() - HOUR_MS),
  expiresAt: timestamp(Date.now() + HOUR_MS),
  ...overrides,
});

const BOTH_STUDENTS = { [OLENA_ID]: student('Olena', 1000), [TARAS_ID]: student('Taras', 2000) };

const DEALT = {
  w0: { hiddenFromPlayerId: OLENA_ID, guessedByPlayerId: null },
  w1: { hiddenFromPlayerId: TARAS_ID, guessedByPlayerId: null },
};

let emitRoom: (snapshot: { exists: () => boolean; data: () => unknown }) => void;

const renderRoomPage = () =>
  render(
    <ThemeProvider theme={theme}>
      <FrameSlotProvider>
        <MemoryRouter initialEntries={[roomPath('room-1')]}>
          <Frame />
          <Routes>
            <Route path={ROOM_ROUTE_PATTERN} element={<RoomPage />} />
          </Routes>
        </MemoryRouter>
      </FrameSlotProvider>
    </ThemeProvider>,
  );

/** Opens the link as the person `uid` is, and lets Firestore deliver the room behind it. */
const openLessonAs = async (uid: string, room: unknown) => {
  vi.mocked(signInAnonymously).mockResolvedValue({ user: { uid } } as never);
  renderRoomPage();

  await waitFor(() => expect(onSnapshot).toHaveBeenCalled());
  await act(async () => {
    emitRoom({ exists: () => true, data: () => room });
  });
};

/** Every write the screen made, as the fields each one carried. */
const writes = (): Record<string, unknown>[] =>
  vi.mocked(updateDoc).mock.calls.map(([, update]) => update as unknown as Record<string, unknown>);

const isPresenceMark = (update: Record<string, unknown>) =>
  Object.keys(update).every((field) => field === 'expiresAt' || field.endsWith('.lastSeenAt'));

const CLAUSE = ', and the teacher watching from the house at the end of the street';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(updateDoc).mockResolvedValue(undefined);
  vi.mocked(isSupported).mockResolvedValue(true);
  vi.mocked(initializeAnalytics).mockReturnValue({ app: 'fake-analytics' } as unknown as Analytics);
  vi.mocked(onSnapshot).mockImplementation(((_reference: unknown, onNext: typeof emitRoom) => {
    emitRoom = onNext;

    return vi.fn();
  }) as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the teacher opening their own lesson', () => {
  it.each([
    ['nobody in yet', {}],
    ['one student in', { [OLENA_ID]: student('Olena', 1000) }],
    ['both students in', BOTH_STUDENTS],
  ])('lands in the lobby, and is never asked for a nickname, with %s', async (_name, students) => {
    await openLessonAs(TEACHER_ID, storedLesson(students));

    expect(screen.getByRole('heading', { level: 1, name: 'Lobby' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/nickname/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /join the/i })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('offers the link while a seat is free, worded for two students, and takes it away at two', async () => {
    await openLessonAs(TEACHER_ID, storedLesson());

    expect(
      screen.getByText(
        'Send this link to both of your players. They join with a nickname, no sign-up.',
      ),
    ).toBeInTheDocument();

    await act(async () => {
      emitRoom({ exists: () => true, data: () => storedLesson(BOTH_STUDENTS) });
    });

    expect(screen.queryByRole('textbox', { name: 'Invite link' })).toBeNull();
  });

  it('marks itself present in the teacher’s own field and never joins the players', async () => {
    await openLessonAs(TEACHER_ID, storedLesson());

    await waitFor(() => expect(updateDoc).toHaveBeenCalled());

    expect(writes().map((write) => Object.keys(write).sort())).toEqual([
      ['expiresAt', 'teacher.lastSeenAt'],
    ]);
    expect(writes().flatMap((write) => Object.keys(write))).not.toContain(`players.${TEACHER_ID}`);
  });

  it('sees a student arrive without reloading, in the second row', async () => {
    await openLessonAs(TEACHER_ID, storedLesson());
    const players = () => within(screen.getByRole('region', { name: 'In the room' }));

    expect(players().getByText('A free seat. Waiting for the first player')).toBeInTheDocument();

    await act(async () => {
      emitRoom({
        exists: () => true,
        data: () => storedLesson({ [OLENA_ID]: student('Olena', 1000) }),
      });
    });

    expect(players().getByText('Olena')).toBeInTheDocument();
    expect(players().queryByText(/first player/)).toBeNull();
  });

  it('deals the words to the two students only, and writes no word to the teacher', async () => {
    await openLessonAs(TEACHER_ID, storedLesson(BOTH_STUDENTS));

    fireEvent.click(screen.getByRole('button', { name: 'Deal the words' }));

    await waitFor(() => expect(writes().filter((write) => !isPresenceMark(write))).toHaveLength(1));

    const [deal] = writes().filter((write) => !isPresenceMark(write));

    expect(deal?.status).toBe('playing');
    const dealt = [deal?.['words.w0.hiddenFromPlayerId'], deal?.['words.w1.hiddenFromPlayerId']];

    expect([...dealt].sort()).toEqual([OLENA_ID, TARAS_ID]);
    expect(dealt).not.toContain(TEACHER_ID);
  });

  it('stays in their own room once the words are dealt: not the form, not "has already begun"', async () => {
    await openLessonAs(
      TEACHER_ID,
      storedLesson(BOTH_STUDENTS, { status: 'playing', words: DEALT }),
    );

    expect(screen.queryByText('This lesson has already begun')).toBeNull();
    expect(screen.queryByText('This game has already begun')).toBeNull();
    expect(screen.queryByRole('button', { name: /join the/i })).toBeNull();
    expect(screen.queryByLabelText(/nickname/i)).toBeNull();
  });

  it('goes on marking itself present while the lesson is played', async () => {
    await openLessonAs(
      TEACHER_ID,
      storedLesson(BOTH_STUDENTS, { status: 'playing', words: DEALT }),
    );

    await waitFor(() => expect(updateDoc).toHaveBeenCalled());

    expect(writes().every((write) => 'teacher.lastSeenAt' in write)).toBe(true);
  });
});

describe('a student arriving by the lesson’s link', () => {
  it('is asked to join a lesson, by the teacher’s name', async () => {
    await openLessonAs(OLENA_ID, storedLesson());

    expect(screen.getByRole('heading', { level: 1, name: 'Join the lesson' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Carmen has invited you to a lesson. Pick a name the others will know you by.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Join the lesson' })).toBeInTheDocument();
  });

  it('sees the teacher at the end of the street while their mark is fresh', async () => {
    await openLessonAs(OLENA_ID, storedLesson());

    expect(
      screen.getByRole('img', {
        name: `A neighbour waving from her balcony to an empty balcony across the street${CLAUSE}`,
      }),
    ).toBeInTheDocument();
  });

  it('sees the curtains drawn, and no clause, once the teacher’s mark is old', async () => {
    const stale = storedLesson(
      {},
      { teacher: { nickname: 'Carmen', lastSeenAt: timestamp(Date.now() - AWAY_AFTER_MS - 5000) } },
    );
    await openLessonAs(OLENA_ID, stale);

    expect(
      screen.getByRole('img', {
        name: 'A neighbour waving from her balcony to an empty balcony across the street',
      }),
    ).toBeInTheDocument();
  });

  it('joins as a player under their own id, and not as the teacher', async () => {
    await openLessonAs(OLENA_ID, storedLesson());

    fireEvent.change(screen.getByLabelText(/nickname/i), { target: { value: 'Olena' } });
    fireEvent.click(screen.getByRole('button', { name: 'Join the lesson' }));

    await waitFor(() => expect(updateDoc).toHaveBeenCalled());

    const [join] = writes();

    expect(join).toHaveProperty(`players.${OLENA_ID}`);
    expect(join).not.toHaveProperty('teacher');
  });

  it('takes the second seat, and finds the teacher in the list when it is in', async () => {
    await openLessonAs(TARAS_ID, storedLesson({ [OLENA_ID]: student('Olena', 1000) }));

    expect(screen.getByRole('heading', { level: 1, name: 'Join the lesson' })).toBeInTheDocument();

    await act(async () => {
      emitRoom({ exists: () => true, data: () => storedLesson(BOTH_STUDENTS) });
    });

    expect(screen.getByRole('heading', { level: 1, name: 'Lobby' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'In the room' })).getByText('Carmen'),
    ).toBeInTheDocument();
  });

  it('is told "This lesson is full" when a third arrives, and offered no form', async () => {
    await openLessonAs(STRANGER_ID, storedLesson(BOTH_STUDENTS));

    expect(screen.getByRole('alert')).toHaveTextContent('This lesson is full');
    expect(screen.getByRole('alert')).toHaveTextContent('Ask your teacher which room is yours.');
    expect(screen.queryByLabelText(/nickname/i)).toBeNull();
  });

  it('is told "This lesson has already begun" when they arrive after the deal', async () => {
    await openLessonAs(
      STRANGER_ID,
      storedLesson(BOTH_STUDENTS, { status: 'playing', words: DEALT }),
    );

    expect(screen.getByRole('alert')).toHaveTextContent('This lesson has already begun');
    expect(screen.getByRole('alert')).toHaveTextContent('Ask your teacher which room is yours.');
  });

  it('is still told "The room is full", in the pair game’s words, by a pair game', async () => {
    const pair = {
      ...storedLesson(),
      mode: 'pair',
      teacher: undefined,
      ownerId: 'owner-uid',
      players: {
        'owner-uid': student('Vik', 1000),
        [OLENA_ID]: student('Olena', 2000),
      },
    };
    await openLessonAs(STRANGER_ID, pair);

    expect(screen.getByRole('alert')).toHaveTextContent('The room is full');
  });
});

describe('a lesson deal the rules refuse', () => {
  const REFUSED_BY_RULES = new FirebaseError(
    'permission-denied',
    'Missing or insufficient permissions.',
  );
  /** Both students have marked every word answered, in the lobby, where the rules let them. */
  const MARKED_IN_THE_LOBBY = {
    w0: { hiddenFromPlayerId: null, guessedByPlayerId: OLENA_ID },
    w1: { hiddenFromPlayerId: null, guessedByPlayerId: TARAS_ID },
  };
  const markedLobby = () => storedLesson(BOTH_STUDENTS, { words: MARKED_IN_THE_LOBBY });
  /** The deal applied at once, as the SDK shows the teacher before the server has judged it. */
  const optimisticallyPlaying = () =>
    storedLesson(BOTH_STUDENTS, {
      status: 'playing',
      words: {
        w0: { hiddenFromPlayerId: OLENA_ID, guessedByPlayerId: OLENA_ID },
        w1: { hiddenFromPlayerId: TARAS_ID, guessedByPlayerId: TARAS_ID },
      },
    });
  const emit = (room: unknown) =>
    act(async () => {
      emitRoom({ exists: () => true, data: () => room });
    });

  /** The deal waits for the server; the teacher's presence marks do not. Answered by hand. */
  const holdTheDeal = () => {
    const answers: { resolve: () => void; reject: (error: unknown) => void }[] = [];

    vi.mocked(updateDoc).mockImplementation(((_reference: unknown, update: object) =>
      isPresenceMark(update as Record<string, unknown>)
        ? Promise.resolve()
        : new Promise<void>((resolve, reject) => {
            answers.push({ resolve, reject });
          })) as never);

    return answers;
  };

  const boardIsOnScreen = () => document.querySelector('[aria-label*="crossword grid" i]') !== null;

  it('shows the teacher the refusal, and never the game, in the order the SDK was measured to use', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const answers = holdTheDeal();
    let gameSeen = false;
    const observer = new MutationObserver(() => {
      gameSeen ||= boardIsOnScreen();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    await openLessonAs(TEACHER_ID, markedLobby());

    fireEvent.click(screen.getByRole('button', { name: 'Deal the words' }));
    await waitFor(() => expect(writes().filter((write) => !isPresenceMark(write))).toHaveLength(1));
    await emit(optimisticallyPlaying());

    expect(screen.getByRole('button', { name: 'Dealing the words' })).toBeInTheDocument();

    await act(async () => {
      answers[0]?.reject(REFUSED_BY_RULES);
    });
    await emit(markedLobby());

    expect(await screen.findByText('Could not start the game')).toBeInTheDocument();
    expect(
      screen.getByText('Check your connection and try again. Nothing has been dealt out yet.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deal the words' })).toBeEnabled();
    expect(gameSeen).toBe(false);
    expect(boardIsOnScreen()).toBe(false);
    observer.disconnect();
  });

  it('writes no completion for the words the students marked, since nothing was dealt', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const answers = holdTheDeal();
    await openLessonAs(TEACHER_ID, markedLobby());

    fireEvent.click(screen.getByRole('button', { name: 'Deal the words' }));
    await waitFor(() => expect(writes().filter((write) => !isPresenceMark(write))).toHaveLength(1));
    await emit(optimisticallyPlaying());
    await act(async () => {
      answers[0]?.reject(REFUSED_BY_RULES);
    });
    await emit(markedLobby());
    await screen.findByText('Could not start the game');

    const gameWrites = writes().filter((write) => !isPresenceMark(write));

    expect(gameWrites).toHaveLength(1);
    expect(gameWrites[0]).toHaveProperty('status', 'playing');
    expect(writes().filter((write) => write.status === 'completed')).toEqual([]);
  });

  it('sends no completion when the refusal lands before the optimistic room has been drawn', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const answers = holdTheDeal();
    let gameSeen = false;
    const observer = new MutationObserver(() => {
      gameSeen ||= boardIsOnScreen();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    await openLessonAs(TEACHER_ID, markedLobby());

    fireEvent.click(screen.getByRole('button', { name: 'Deal the words' }));
    await waitFor(() => expect(writes().filter((write) => !isPresenceMark(write))).toHaveLength(1));

    // The optimistic room and the refusal in the same turn: the refusal is
    // handled before that room has rendered, and before its effects have run.
    await act(async () => {
      emitRoom({ exists: () => true, data: () => optimisticallyPlaying() });
      answers[0]?.reject(REFUSED_BY_RULES);
    });
    await emit(markedLobby());

    expect(await screen.findByText('Could not start the game')).toBeInTheDocument();
    expect(gameSeen).toBe(false);
    expect(writes().filter((write) => !isPresenceMark(write))).toHaveLength(1);
    expect(writes().filter((write) => write.status === 'completed')).toEqual([]);
    observer.disconnect();
  });

  it('opens the lesson once the server confirms the deal, with "Dealing the words" until then', async () => {
    const answers = holdTheDeal();
    await openLessonAs(TEACHER_ID, storedLesson(BOTH_STUDENTS));

    fireEvent.click(screen.getByRole('button', { name: 'Deal the words' }));
    await waitFor(() => expect(writes().filter((write) => !isPresenceMark(write))).toHaveLength(1));
    await emit(storedLesson(BOTH_STUDENTS, { status: 'playing', words: DEALT }));

    expect(screen.getByRole('button', { name: 'Dealing the words' })).toBeInTheDocument();
    expect(boardIsOnScreen()).toBe(false);

    await act(async () => {
      answers[0]?.resolve();
    });

    await waitFor(() => expect(boardIsOnScreen()).toBe(true));
    expect(screen.queryByText('Could not start the game')).toBeNull();
  });
});
