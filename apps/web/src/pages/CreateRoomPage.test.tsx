import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { logEvent } from 'firebase/analytics';
import { signInAnonymously } from 'firebase/auth';
import { addDoc } from 'firebase/firestore';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { type CrosswordLayout, generateCrossword } from 'shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ROOM_ROUTE_PATTERN } from '../rooms/room-link';
import { CreateRoomPage } from './CreateRoomPage';

// Firebase is the system boundary: mocked so the flow can be driven end to end
// without a project. Everything above it — validation, layout generation, the
// document that gets written — runs for real.
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

// `generateCrossword` runs for real everywhere except the one test that needs a
// layout the real generator cannot produce: a word list of ten or more valid
// words always contains two words sharing a letter, so an empty grid is
// unreachable from the UI — yet the app still has to survive one.
vi.mock('shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('shared')>();

  return { ...actual, generateCrossword: vi.fn(actual.generateCrossword) };
});

const TEN_WORDS = 'apple, bread, cheese, dinner, engine, flower, garden, hunter, island, jacket';

/** `xyz` shares no letter with any of the ten, so it can never be placed. */
const WORDS_WITH_ONE_THAT_CANNOT_FIT = `${TEN_WORDS}, xyz`;

const EMPTY_LAYOUT: CrosswordLayout = {
  rows: 0,
  cols: 0,
  cells: [],
  placedWords: [],
  unplacedWords: ['abc'],
};

/** Stands in for the room screen, so the address the owner ends up at is readable. */
const RoomStub = () => <p>You are in room {useParams().roomId}</p>;

/**
 * The creation screen with the room screen behind it.
 *
 * Creating a room now ends somewhere else, so the route it ends at has to
 * exist: what this page does when the write comes back is leave.
 */
const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/create']}>
      <Routes>
        <Route path="/create" element={<CreateRoomPage />} />
        <Route path={ROOM_ROUTE_PATTERN} element={<RoomStub />} />
      </Routes>
    </MemoryRouter>,
  );

/** Waits until the owner has landed inside the room that was just written. */
const insideRoom = () => screen.findByText(/you are in room room-1/i);

const fillIn = (label: RegExp, value: string) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

const fillInValidGame = (words = TEN_WORDS) => {
  fillIn(/nickname/i, 'Vik');
  fillIn(/words/i, words);
};

const createButton = () => screen.getByRole('button', { name: /create room/i });

/** Every analytics event reported so far, as name and parameters. */
const reportedEvents = () =>
  vi.mocked(logEvent).mock.calls.map(([, name, params]) => ({ name, params }));

/**
 * The events about what a player did — the funnel's arrivals left out.
 *
 * Every screen in this file reports that it was reached (issue #51), which is
 * not something anybody did; counting those in would make each assertion about
 * what an action reported depend on which screens the test walked through on
 * the way. Which screens report, and how many times, is asserted on its own.
 */
const reportedActions = () => reportedEvents().filter(({ name }) => name !== 'screen_reached');

beforeEach(() => {
  vi.mocked(signInAnonymously).mockResolvedValue({ user: { uid: 'owner-uid' } } as never);
  vi.mocked(addDoc).mockResolvedValue({ id: 'room-1' } as never);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('CreateRoomPage', () => {
  describe('the word list', () => {
    it('keeps the room locked until the list and the nickname are both usable', () => {
      renderPage();

      expect(createButton()).toBeDisabled();

      fillIn(/words/i, TEN_WORDS);
      expect(createButton()).toBeDisabled();

      fillIn(/nickname/i, 'Vik');
      expect(createButton()).toBeEnabled();
    });

    it('says what is wrong with the list while the owner is still typing', () => {
      renderPage();

      fillIn(/words/i, 'apple, ox, apple');

      expect(screen.getByText(/at least 10 words/i)).toBeInTheDocument();
      expect(screen.getByText(/"ox" is shorter than 3 letters/i)).toBeInTheDocument();
      expect(screen.getByText(/"apple" is listed more than once/i)).toBeInTheDocument();
    });

    it('says nothing about a form nobody has typed into yet', () => {
      renderPage();

      expect(screen.queryByText(/at least 10 words/i)).not.toBeInTheDocument();
    });
  });

  describe('creating the room', () => {
    it('takes the owner into the room it just created', async () => {
      renderPage();
      fillInValidGame();

      fireEvent.click(createButton());

      expect(await insideRoom()).toBeInTheDocument();
      expect(addDoc).toHaveBeenCalledOnce();
    });

    it('joins the owner to their own room as its first player', async () => {
      renderPage();
      fillInValidGame();

      fireEvent.click(createButton());

      await insideRoom();
      expect(signInAnonymously).toHaveBeenCalledOnce();
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ownerId: 'owner-uid',
          players: { 'owner-uid': expect.objectContaining({ nickname: 'Vik' }) },
        }),
      );
    });

    it('writes a room whose words are exactly the ones that made it into the grid', async () => {
      renderPage();
      fillInValidGame();

      fireEvent.click(createButton());

      await insideRoom();

      const [call] = vi.mocked(addDoc).mock.calls;
      // The written document is typed as `unknown` by the Firestore mock; the
      // shape asserted here is the one `buildRoomDocument` guarantees.
      const room = call?.[1] as { layout: CrosswordLayout; words: Record<string, unknown> };

      expect(Object.keys(room.words)).toHaveLength(room.layout.placedWords.length);
    });

    it('tells the owner when the room could not be written, and leaves them on the form', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(addDoc).mockRejectedValue(new Error('Missing or insufficient permissions.'));
      renderPage();
      fillInValidGame();

      fireEvent.click(createButton());

      expect(await screen.findByText(/could not be created/i)).toBeInTheDocument();
      expect(screen.queryByText(/you are in room/i)).not.toBeInTheDocument();
      expect(screen.getByLabelText(/words/i)).toHaveValue(TEN_WORDS);
    });
  });

  describe('what it reports', () => {
    it('reports a created room by its size, and by nothing else about it', async () => {
      renderPage();
      fillInValidGame();

      fireEvent.click(createButton());
      await insideRoom();

      await waitFor(() => {
        expect(reportedActions()).toEqual([
          { name: 'room_created', params: { word_count: expect.any(Number) } },
        ]);
      });
      // The two things this screen knows and must not tell: which room it is,
      // and who its owner said they are.
      expect(JSON.stringify(reportedEvents())).not.toContain('room-1');
      expect(JSON.stringify(reportedEvents())).not.toContain('Vik');
    });

    it('reports that the second screen of the funnel was reached', async () => {
      renderPage();

      await waitFor(() => {
        expect(reportedEvents()).toEqual([
          { name: 'screen_reached', params: { screen: 'create' } },
        ]);
      });
    });

    it('reports nothing when the room was never written', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(addDoc).mockRejectedValue(new Error('Missing or insufficient permissions.'));
      renderPage();
      fillInValidGame();

      fireEvent.click(createButton());

      await screen.findByText(/could not be created/i);
      expect(reportedActions()).toEqual([]);
    });
  });

  describe('words that did not fit into the grid', () => {
    it('warns the owner before anything is written', () => {
      renderPage();
      fillInValidGame(WORDS_WITH_ONE_THAT_CANNOT_FIT);

      fireEvent.click(createButton());

      expect(screen.getByText(/did not fit into the crossword/i)).toBeInTheDocument();
      expect(screen.getByText(/\bxyz\b/)).toBeInTheDocument();
      expect(addDoc).not.toHaveBeenCalled();
    });

    it('creates the room once the owner accepts the loss', async () => {
      renderPage();
      fillInValidGame(WORDS_WITH_ONE_THAT_CANNOT_FIT);
      fireEvent.click(createButton());

      fireEvent.click(screen.getByRole('button', { name: /create room anyway/i }));

      await insideRoom();
      expect(addDoc).toHaveBeenCalledOnce();
    });

    it('returns to the untouched word list when the owner would rather fix it', () => {
      renderPage();
      fillInValidGame(WORDS_WITH_ONE_THAT_CANNOT_FIT);
      fireEvent.click(createButton());

      fireEvent.click(screen.getByRole('button', { name: /edit the word list/i }));

      expect(screen.getByLabelText(/words/i)).toHaveValue(WORDS_WITH_ONE_THAT_CANNOT_FIT);
      expect(addDoc).not.toHaveBeenCalled();
    });
  });

  describe('a word list no crossword can be built from', () => {
    it('refuses to create the room and explains why', () => {
      vi.mocked(generateCrossword).mockReturnValueOnce(EMPTY_LAYOUT);
      renderPage();
      fillInValidGame();

      fireEvent.click(createButton());

      expect(screen.getByText(/none of these words cross each other/i)).toBeInTheDocument();
      expect(addDoc).not.toHaveBeenCalled();
    });

    it('drops the complaint as soon as the owner edits the list', async () => {
      vi.mocked(generateCrossword).mockReturnValueOnce(EMPTY_LAYOUT);
      renderPage();
      fillInValidGame();
      fireEvent.click(createButton());

      fillIn(/words/i, `${TEN_WORDS}, kitchen`);

      await waitFor(() => {
        expect(screen.queryByText(/none of these words cross each other/i)).not.toBeInTheDocument();
      });
    });
  });
});
