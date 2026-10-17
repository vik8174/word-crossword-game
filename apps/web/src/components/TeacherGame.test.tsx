import { ThemeProvider } from '@mui/material/styles';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { SQUARE_FACE_CLASS } from '../motion';
import { MOTION_PLAY_CSS } from '../motion-play-styles';
import { logGameEvent } from '../telemetry/analytics';
import { STREET } from '../street';
import { theme } from '../theme';
import { FEW, lessonRoom, TEACHER_ID } from './drawn-room';
import { Frame } from './Frame';
import { FrameSlotProvider } from './FrameSlotProvider';
import { RoomGame } from './RoomGame';
import { roomStreetLabel } from './street-labels';
import type { RoomDocument } from '../rooms/room-document';

// The database is the boundary: the room is handed in and the writes are
// stubbed, so what is asserted is the screen and what it asks the room to do.
vi.mock('../rooms/room-service', () => ({
  recordGuess: vi.fn(() => Promise.resolve()),
  endGameEarly: vi.fn(() => Promise.resolve()),
  completeGame: vi.fn(() => Promise.resolve()),
}));
vi.mock('../telemetry/analytics', () => ({ logGameEvent: vi.fn(() => Promise.resolve()) }));

/**
 * The room of a lesson's teacher (`playing` as the template's host of a lesson):
 * every word of the crossword in full and marked by who explains it, a board
 * nothing can be typed into, and the one thing the teacher can do, which is to
 * end the lesson. The students' half is `PlayerGame.lesson.test.tsx`.
 */

const ROOM_ID = 'room-1';

const renderTeacher = (room: RoomDocument, endGameEarly = vi.fn(() => Promise.resolve())) =>
  render(
    <ThemeProvider theme={theme}>
      <FrameSlotProvider>
        <MemoryRouter>
          <Frame />
        </MemoryRouter>
        <RoomGame
          roomId={ROOM_ID}
          room={room}
          viewerId={TEACHER_ID}
          writes={{ recordGuess: vi.fn(() => Promise.resolve()), endGameEarly }}
        />
      </FrameSlotProvider>
    </ThemeProvider>,
  );

const playingLesson = () => lessonRoom(FEW, 7, 9);

/** The same lesson before the deal: a lobby whose words are hidden from nobody. */
const undealtLesson = (): RoomDocument => {
  const room = lessonRoom(FEW, 7, 9, { status: 'lobby' });

  return {
    ...room,
    words: Object.fromEntries(
      Object.keys(room.words).map((id) => [
        id,
        { hiddenFromPlayerId: null, guessedByPlayerId: null },
      ]),
    ),
  };
};

const listOf = (name: string) => screen.getByRole('list', { name });

const rowsOf = (name: string) =>
  within(listOf(name))
    .getAllByRole('listitem')
    .map((row) => row.textContent);

/** The grid of squares, named as the teacher's board names it. */
const board = () => screen.getByRole('img', { name: /^Crossword grid, 7 by 9/ });

/** The box of the square at a row and column of the 7 by 9 board, holes counted. */
const squareAt = (row: number, col: number): HTMLElement => {
  const outer = board().children.item(row * 9 + col);
  const inner = outer?.firstElementChild;

  if (!(inner instanceof HTMLElement)) {
    throw new Error(`No square at ${row}, ${col}`);
  }

  return inner;
};

const hexToRgb = (hex: string): string => {
  const [r, g, b] = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));

  return `rgb(${r}, ${g}, ${b})`;
};

beforeEach(() => {
  vi.mocked(logGameEvent).mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the teacher’s room, before anything is asked of it', () => {
  it('names each student’s words in full, with whether the other one has answered them', () => {
    renderTeacher(playingLesson());

    expect(screen.getByRole('heading', { name: 'Olena explains' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Taras explains' })).toBeInTheDocument();
    expect(rowsOf('Olena explains')).toEqual([
      '1 acrossbread✓ answered',
      '5 acrossdinnernot yet',
      '6 acrossflowernot yet',
    ]);
    expect(rowsOf('Taras explains')).toEqual([
      '2 downenginenot yet',
      '3 downcheesenot yet',
      '4 downapplenot yet',
    ]);
  });

  it('counts each student’s words answered, by the one who guesses them', () => {
    renderTeacher(playingLesson());

    expect(screen.getByText('1 of 3 answered by Taras.')).toBeInTheDocument();
    expect(screen.getByText('0 of 3 answered by Olena.')).toBeInTheDocument();
  });

  it('says in its header who is playing and that the teacher is watching, and offers to end the lesson', () => {
    renderTeacher(playingLesson());

    expect(screen.getByText('Olena and Taras are playing. You are watching.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'End the lesson' })).toBeInTheDocument();
  });

  it('lists the teacher among the people in the room, tagged as the one reading', () => {
    renderTeacher(playingLesson());

    expect(screen.getByText('Carmen')).toBeInTheDocument();
    expect(screen.getByText('teacher, you')).toBeInTheDocument();
    expect(screen.getByText('Olena')).toBeInTheDocument();
    expect(screen.getByText('Taras')).toBeInTheDocument();
  });

  it('draws the words as plain rows: nothing in either list is a button, since a row does nothing', () => {
    renderTeacher(playingLesson());

    for (const name of ['Olena explains', 'Taras explains']) {
      expect(within(listOf(name)).queryAllByRole('button')).toHaveLength(0);
    }
    // The only control on the whole screen is the one that ends the lesson.
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'End the lesson',
    ]);
  });

  it('draws each square as whose it is, and a crossing of the two students’ words as the left one’s', () => {
    renderTeacher(playingLesson());

    // `bread` is answered, so its squares are answered even where `engine` crosses them.
    expect(getComputedStyle(squareAt(0, 3)).backgroundColor).toBe(hexToRgb(STREET.sage));
    // `engine`, Taras's, runs down from (0,4): its second letter is on `stone`, dotted.
    expect(getComputedStyle(squareAt(1, 4)).backgroundColor).toBe(hexToRgb(STREET.stone));
    expect(getComputedStyle(squareAt(1, 4)).outline).toMatch(/dotted/);
    expect(getComputedStyle(squareAt(6, 1)).backgroundColor).toBe(hexToRgb(STREET.stone));
    // `dinner`, Olena's, starts at (3,3) and crosses `engine` at (3,4): the left student's.
    expect(getComputedStyle(squareAt(3, 3)).backgroundColor).toBe(hexToRgb(STREET.wash));
    expect(getComputedStyle(squareAt(3, 4)).backgroundColor).toBe(hexToRgb(STREET.wash));
    expect(getComputedStyle(squareAt(3, 4)).fontStyle).toBe('italic');
    // Every word is on the board, spelled in full.
    expect(squareAt(3, 3)).toHaveTextContent('D');
    expect(squareAt(6, 1)).toHaveTextContent('E');
  });

  it('prints the crossword numbers on the squares a word starts in', () => {
    renderTeacher(playingLesson());

    expect(squareAt(3, 3).parentElement).toHaveTextContent('5');
    expect(squareAt(0, 2).parentElement).toHaveTextContent('1');
  });

  it('says under the board whose squares are which, and that bold letters are answered', () => {
    renderTeacher(playingLesson());

    expect(
      screen.getByText('Olena explains · Taras explains · bold letters are answered'),
    ).toBeInTheDocument();
  });
});

describe('the teacher’s board', () => {
  const squaresOfBoard = () => board().querySelectorAll('div');

  it('holds no input, no link, no button and nothing in the tab order', () => {
    renderTeacher(playingLesson());

    expect(
      board().querySelectorAll('input, textarea, a, button, [tabindex], [contenteditable]'),
    ).toHaveLength(0);
    expect(squaresOfBoard().length).toBeGreaterThan(0);
  });

  it('changes no square for anything typed or any arrow pressed, and takes no focus', () => {
    renderTeacher(playingLesson());
    const before = board().innerHTML;

    for (const key of ['ArrowRight', 'ArrowDown', 'a', 'Backspace', ' ', 'Tab']) {
      fireEvent.keyDown(board(), { key });
      fireEvent.keyDown(document.body, { key });
      fireEvent.keyPress(board(), { key, charCode: key.charCodeAt(0) });
    }
    board().dispatchEvent(new Event('input', { bubbles: true }));
    board().dispatchEvent(new InputEvent('beforeinput', { bubbles: true, data: 'x' }));
    fireEvent.mouseDown(squareAt(1, 4));
    fireEvent.click(squareAt(1, 4));

    expect(board().innerHTML).toBe(before);
    expect(document.activeElement).toBe(document.body);
    expect(board().querySelectorAll('input')).toHaveLength(0);
  });

  it('is named once, as a picture, with every word shown', () => {
    renderTeacher(playingLesson());

    expect(board()).toHaveAccessibleName(/every word shown/);
  });
});

describe('a word answered while the teacher is watching', () => {
  const answered = (room: RoomDocument): RoomDocument => ({
    ...room,
    words: {
      ...room.words,
      w1: { hiddenFromPlayerId: 'taras-uid', guessedByPlayerId: 'taras-uid' },
    },
  });

  it('turns its squares over once, as the player’s board does, and not those answered before', () => {
    const open = lessonRoom(FEW, 7, 9);
    // The room the teacher opens has `bread` answered already; `engine` (w1) is answered next.
    const { rerender } = renderTeacher(open);

    const draw = (room: RoomDocument) =>
      rerender(
        <ThemeProvider theme={theme}>
          <FrameSlotProvider>
            <MemoryRouter>
              <Frame />
            </MemoryRouter>
            <RoomGame roomId={ROOM_ID} room={room} viewerId={TEACHER_ID} />
          </FrameSlotProvider>
        </ThemeProvider>,
      );

    expect(board().querySelectorAll('.just')).toHaveLength(0);

    draw(answered(open));

    // `engine`, six squares, one of them shared with `bread`, which was answered already.
    expect(board().querySelectorAll('.just').length).toBeGreaterThanOrEqual(5);
    expect(squareAt(0, 3).parentElement).not.toHaveClass('just');
    // The wave's colour runs on the face by this class; the stylesheet must name it.
    const wave = board().querySelector('.just');
    expect(wave?.firstElementChild).toHaveClass(SQUARE_FACE_CLASS);
    expect(MOTION_PLAY_CSS).toContain(`.cell.just>.${SQUARE_FACE_CLASS}{`);
  });
});

describe('the band over the teacher’s board', () => {
  beforeEach(() => {
    // A window tall enough for the board to leave room for the drawing above it.
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(1000);
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1440);
  });

  it('is #228’s label with the teacher’s clause once, because the teacher is always at their window', () => {
    renderTeacher(playingLesson());

    expect(
      screen.getByRole('img', { name: roomStreetLabel({ viewer: 'teacher' }) }),
    ).toBeInTheDocument();
  });

  it('draws the teacher at the end of the street whatever the teacher’s own mark says', () => {
    // The teacher's own mark is old: the notice says so, and the drawing does not.
    renderTeacher(lessonRoom(FEW, 7, 9, { silentFor: { [TEACHER_ID]: 150_000 } }));

    const street = screen.getByRole('img', { name: roomStreetLabel({ viewer: 'teacher' }) });

    // Two neighbours and the teacher, each in a window of their own.
    expect(street.querySelectorAll('.who')).toHaveLength(3);
  });

  it('hangs every answered word on the line, as the teacher may name them all', () => {
    renderTeacher(playingLesson());

    const street = screen.getByRole('img', { name: roomStreetLabel({ viewer: 'teacher' }) });

    expect([...street.querySelectorAll('.card')].map((card) => card.textContent)).toEqual([
      'bread',
    ]);
  });
});

describe('the teacher’s own mark', () => {
  it('tells the teacher the room has not heard from them, in the left zone, with their own row away', () => {
    renderTeacher(lessonRoom(FEW, 7, 9, { silentFor: { [TEACHER_ID]: 180_000 } }));

    expect(screen.getByText('The room has not heard from you')).toBeInTheDocument();
    expect(screen.getByText('away for 3 min')).toBeInTheDocument();
  });

  it('says nothing of it while the room hears from them', () => {
    renderTeacher(playingLesson());

    expect(screen.queryByText('The room has not heard from you')).not.toBeInTheDocument();
  });
});

describe('ending the lesson', () => {
  it('asks first, in the lesson’s own words, with "End it" quiet and "Keep watching" the loud one', () => {
    renderTeacher(playingLesson());

    fireEvent.click(screen.getByRole('button', { name: 'End the lesson' }));

    const dialog = screen.getByRole('dialog', { name: 'End the lesson?' });

    expect(
      within(dialog).getByText(/You will see the lesson summary\. This cannot be undone\./),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'End it' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Keep watching' })).toBeInTheDocument();
  });

  it('writes the ending of this room once the teacher has said so, and reports it as a lesson’s', async () => {
    const endGameEarly = vi.fn(() => Promise.resolve());
    renderTeacher(playingLesson(), endGameEarly);

    fireEvent.click(screen.getByRole('button', { name: 'End the lesson' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'End it' }));

    await waitFor(() => expect(endGameEarly).toHaveBeenCalledExactlyOnceWith(ROOM_ID));
    await waitFor(() =>
      expect(logGameEvent).toHaveBeenCalledExactlyOnceWith('game_closed', {
        word_count: 6,
        player_count: 2,
        mode: 'lesson',
      }),
    );
  });

  it('writes nothing when the teacher keeps watching', () => {
    const endGameEarly = vi.fn(() => Promise.resolve());
    renderTeacher(playingLesson(), endGameEarly);

    fireEvent.click(screen.getByRole('button', { name: 'End the lesson' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep watching' }));

    expect(endGameEarly).not.toHaveBeenCalled();
    expect(logGameEvent).not.toHaveBeenCalled();
  });

  it('says so in the same dialog when the database refuses, and offers to try again', async () => {
    const refused = vi.fn(() => Promise.reject(new Error('refused')));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderTeacher(playingLesson(), refused);

    fireEvent.click(screen.getByRole('button', { name: 'End the lesson' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'End it' }));

    const dialog = await screen.findByRole('dialog', { name: 'End the lesson?' });

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'The game could not be ended. The room may have expired, or it may have ended already.',
    );
    expect(within(dialog).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Keep watching' })).toBeInTheDocument();
    expect(logGameEvent).not.toHaveBeenCalled();
  });

  it('shows the control as busy while the ending is on its way', async () => {
    renderTeacher(
      playingLesson(),
      vi.fn(() => new Promise<void>(() => undefined)),
    );

    fireEvent.click(screen.getByRole('button', { name: 'End the lesson' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'End it' }));

    expect(await screen.findByRole('button', { name: 'Ending the lesson' })).toBeInTheDocument();
  });
});

describe('what the teacher is never shown', () => {
  /** The notice a player the deal did not cover is given, which is false of a teacher. */
  const LEFT_OUT = /running without you/i;

  it('is the left-out notice: not before the deal', () => {
    renderTeacher(undealtLesson());

    expect(screen.queryByText(LEFT_OUT)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/dealt out just as you arrived/i);
  });

  it('is the left-out notice: not while the lesson is played', () => {
    renderTeacher(playingLesson());

    expect(screen.queryByText(LEFT_OUT)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/dealt out just as you arrived/i);
  });

  it('is the left-out notice: not once the lesson has been ended, either way', () => {
    for (const status of ['closed', 'completed'] as const) {
      const { unmount } = renderTeacher(lessonRoom(FEW, 7, 9, { status }));

      expect(screen.queryByText(LEFT_OUT)).not.toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/dealt out just as you arrived/i);
      unmount();
    }
  });

  it('is a word of the crossword that is hidden from nobody: before the deal there is nothing to read', () => {
    renderTeacher(undealtLesson());

    expect(screen.queryByText('bread')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Olena explains' })).not.toBeInTheDocument();
  });

  it('is a player’s two halves: the teacher explains nothing and guesses nothing', () => {
    renderTeacher(playingLesson());

    expect(screen.queryByRole('heading', { name: 'You explain' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'You guess' })).not.toBeInTheDocument();
  });
});
