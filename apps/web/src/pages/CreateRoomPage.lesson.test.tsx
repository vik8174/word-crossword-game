import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { signInAnonymously } from 'firebase/auth';
import { addDoc } from 'firebase/firestore';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ROOM_ROUTE_PATTERN } from '../rooms/room-link';
import { CreateRoomPage } from './CreateRoomPage';

// Firebase is the system boundary: mocked so the flow can be driven end to end.
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ name: 'auth' })),
  signInAnonymously: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ name: 'firestore' })),
  collection: vi.fn(() => ({ path: 'rooms' })),
  addDoc: vi.fn(),
  deleteField: vi.fn(() => ({ field: 'deleted' })),
}));
vi.mock('firebase/analytics', () => ({
  initializeAnalytics: vi.fn(() => ({ app: 'fake-analytics' })),
  isSupported: vi.fn(() => Promise.resolve(true)),
  logEvent: vi.fn(),
  setDefaultEventParameters: vi.fn(),
}));

/**
 * The choice `/create` opens with: a game with a friend or a lesson to run
 * (template lines 846-854). The rest of the screen is `CreateRoomPage.test.tsx`.
 */

const TEN_WORDS = 'apple, bread, cheese, dinner, engine, flower, garden, hunter, island, jacket';

const RoomStub = () => <p>You are in room {useParams().roomId}</p>;

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/create']}>
      <Routes>
        <Route path="/create" element={<CreateRoomPage />} />
        <Route path={ROOM_ROUTE_PATTERN} element={<RoomStub />} />
      </Routes>
    </MemoryRouter>,
  );

const lessonCard = () => screen.getByRole('radio', { name: /Run a lesson/ });
const title = () => screen.getByRole('heading', { level: 1 });

const fillIn = (label: RegExp, value: string) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

/** The document the screen handed to Firestore. */
const writtenRoom = () =>
  vi.mocked(addDoc).mock.calls[0]?.[1] as unknown as Record<string, unknown>;

beforeEach(() => {
  window.localStorage.clear();
  vi.mocked(signInAnonymously).mockResolvedValue({ user: { uid: 'owner-uid' } } as never);
  vi.mocked(addDoc).mockResolvedValue({ id: 'room-1' } as never);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('the mode, on /create', () => {
  it('comes first: before the nickname and the words, after the title', () => {
    renderPage();

    const group = screen.getByRole('radiogroup', { name: 'What kind of game' });
    const nickname = screen.getByLabelText(/nickname/i);

    expect(title().compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(group.compareDocumentPosition(nickname) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('opens on a game with a friend', () => {
    renderPage();

    expect(screen.getByRole('radio', { name: /Play with a friend/ })).toBeChecked();
    expect(title()).toHaveTextContent('New game');
    expect(
      screen.getByText('The other player sees you by this name. You play in your own room too.'),
    ).toBeInTheDocument();
  });

  it('turns into "New lesson" and says the teacher does not play once a lesson is chosen', () => {
    renderPage();

    fireEvent.click(lessonCard());

    expect(title()).toHaveTextContent('New lesson');
    expect(
      screen.getByText(
        'Your players see you by this name. In a lesson you do not play: you deal the words and watch.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/You play in your own room too/)).toBeNull();
  });

  it('keeps what was typed when the mode is changed', () => {
    renderPage();
    fillIn(/nickname/i, 'Carmen');
    fillIn(/words/i, TEN_WORDS);

    fireEvent.click(lessonCard());

    expect(screen.getByLabelText(/nickname/i)).toHaveValue('Carmen');
    expect(screen.getByLabelText(/words/i)).toHaveValue(TEN_WORDS);
  });

  it('creates a lesson with the teacher outside players when a lesson was chosen', async () => {
    renderPage();
    fireEvent.click(lessonCard());
    fillIn(/nickname/i, 'Carmen');
    fillIn(/words/i, TEN_WORDS);

    fireEvent.click(screen.getByRole('button', { name: /create room/i }));

    await screen.findByText(/you are in room room-1/i);

    expect(writtenRoom()).toMatchObject({
      mode: 'lesson',
      ownerId: 'owner-uid',
      players: {},
      teacher: { nickname: 'Carmen' },
    });
  });

  it('creates a pair game, with its mode stated, when the choice was left alone', async () => {
    renderPage();
    fillIn(/nickname/i, 'Vik');
    fillIn(/words/i, TEN_WORDS);

    fireEvent.click(screen.getByRole('button', { name: /create room/i }));

    await screen.findByText(/you are in room room-1/i);

    expect(writtenRoom()).toMatchObject({
      mode: 'pair',
      players: { 'owner-uid': expect.objectContaining({ nickname: 'Vik' }) },
    });
    expect(writtenRoom()).not.toHaveProperty('teacher');
  });

  it('freezes the choice while the room is written, with the lesson still chosen', async () => {
    vi.mocked(addDoc).mockReturnValue(new Promise(() => undefined));
    renderPage();
    fireEvent.click(lessonCard());
    fillIn(/nickname/i, 'Carmen');
    fillIn(/words/i, TEN_WORDS);

    fireEvent.click(screen.getByRole('button', { name: /create room/i }));

    await waitFor(() => expect(lessonCard()).toBeDisabled());
    expect(lessonCard()).toBeChecked();
    expect(screen.getByRole('radio', { name: /Play with a friend/ })).toBeDisabled();
  });
});
