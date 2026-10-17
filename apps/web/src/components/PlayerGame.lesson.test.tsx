import { ThemeProvider } from '@mui/material/styles';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { theme } from '../theme';
import { FEW, gameRoom, lessonRoom, OLENA_ID, OWNER_ID, TARAS_ID, TEACHER_ID } from './drawn-room';
import { Frame } from './Frame';
import { FrameSlotProvider } from './FrameSlotProvider';
import { RoomGame } from './RoomGame';
import { BAND_LABEL } from './street-labels';
import type { RoomDocument } from '../rooms/room-document';

// The database is the boundary, as it is for the teacher's room.
vi.mock('../rooms/room-service', () => ({
  recordGuess: vi.fn(() => Promise.resolve()),
  endGameEarly: vi.fn(() => Promise.resolve()),
  completeGame: vi.fn(() => Promise.resolve()),
}));
vi.mock('../telemetry/analytics', () => ({ logGameEvent: vi.fn(() => Promise.resolve()) }));

/**
 * A student's room in a lesson (`playing` and `playing/teacheraway` of the
 * template, as a player): no way to end the game, a header that says who is
 * watching, and the teacher among the people in the room. The teacher's half is `TeacherGame.test.tsx`, and the pair game's is
 * `RoomPage.test.tsx`, which asks the same screen for its End control.
 */

const renderGame = (room: RoomDocument, viewerId: string) =>
  render(
    <ThemeProvider theme={theme}>
      <FrameSlotProvider>
        <MemoryRouter>
          <Frame />
        </MemoryRouter>
        <RoomGame roomId="room-1" room={room} viewerId={viewerId} />
      </FrameSlotProvider>
    </ThemeProvider>,
  );

const teacherAway = () => lessonRoom(FEW, 7, 9, { silentFor: { [TEACHER_ID]: 150_000 } });

/** The street over the board, which no game draws: found by the sentence it is named with. */
const streetOver = () => screen.queryByRole('img', { name: (name) => name.startsWith(BAND_LABEL) });

beforeEach(() => {
  // A window tall enough for the drawing to have fitted above the board, so its
  // absence is the game's rule and not a lack of room.
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(1000);
  vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1440);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('a student’s room in a lesson', () => {
  it('has no control to end the game anywhere, whichever student it is', () => {
    for (const viewer of [OLENA_ID, TARAS_ID]) {
      const { unmount } = renderGame(lessonRoom(FEW, 7, 9), viewer);

      expect(screen.queryByRole('button', { name: /end/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/end the (game|lesson)/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      unmount();
    }
  });

  it('says who they play with and that the teacher is watching', () => {
    renderGame(lessonRoom(FEW, 7, 9), OLENA_ID);

    expect(screen.getByText('Playing with Taras. Carmen is watching.')).toBeInTheDocument();
  });

  it('says it the other way round to the other student', () => {
    renderGame(lessonRoom(FEW, 7, 9), TARAS_ID);

    expect(screen.getByText('Playing with Olena. Carmen is watching.')).toBeInTheDocument();
  });

  it('lists the teacher among the people in the room, with the student’s own row tagged', () => {
    renderGame(lessonRoom(FEW, 7, 9), OLENA_ID);

    const list = within(screen.getByRole('region', { name: 'In the room' })).getAllByRole(
      'listitem',
    );

    expect(list.map((row) => row.textContent)).toEqual(['Carmenteacher', 'Olenayou', 'Taras']);
  });

  it('keeps a student’s own halves: the words they explain and the words they guess, nothing of the other’s', () => {
    renderGame(lessonRoom(FEW, 7, 9), OLENA_ID);

    // Olena explains `bread`, `dinner` and `flower`, and is spelled none of Taras's.
    expect(screen.getByRole('heading', { name: 'You explain' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'You guess' })).toBeInTheDocument();
    expect(screen.getByText('dinner')).toBeInTheDocument();
    expect(screen.queryByText('engine')).not.toBeInTheDocument();
    expect(screen.queryByText('cheese')).not.toBeInTheDocument();
  });

  it('shows no "Olena explains" list or teacher’s board: that is the teacher’s alone', () => {
    renderGame(lessonRoom(FEW, 7, 9), OLENA_ID);

    expect(screen.queryByRole('heading', { name: 'Olena explains' })).not.toBeInTheDocument();
    expect(screen.queryByText(/every word shown/)).not.toBeInTheDocument();
  });
});

describe('a student’s board in a lesson', () => {
  it('has no drawing over it, with the teacher present', () => {
    renderGame(lessonRoom(FEW, 7, 9), OLENA_ID);

    expect(streetOver()).not.toBeInTheDocument();
    expect(screen.queryByText('Carmen is away')).not.toBeInTheDocument();
  });
});

describe('a student whose teacher is away', () => {
  it('is told the game goes on, and that only the teacher can end it', () => {
    renderGame(teacherAway(), OLENA_ID);

    expect(screen.getByText('Carmen is away')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The game goes on without your teacher watching. Only the teacher can end it.',
      ),
    ).toBeInTheDocument();
  });

  it('sees the teacher’s row in the list with how long they have been away', () => {
    renderGame(teacherAway(), OLENA_ID);

    expect(screen.getByText('away for 2 min')).toBeInTheDocument();
  });

  it('has no drawing over their board, so no curtains either', () => {
    renderGame(teacherAway(), OLENA_ID);

    expect(streetOver()).not.toBeInTheDocument();
  });

  it('still has no control to end the game', () => {
    renderGame(teacherAway(), TARAS_ID);

    expect(screen.queryByRole('button', { name: /end/i })).not.toBeInTheDocument();
  });

  it('is told the same of their own absence as ever when it is their own mark that is old', () => {
    renderGame(lessonRoom(FEW, 7, 9, { silentFor: { [OLENA_ID]: 180_000 } }), OLENA_ID);

    expect(screen.getByText('The room has not heard from you')).toBeInTheDocument();
    expect(screen.queryByText('Carmen is away')).not.toBeInTheDocument();
  });
});

describe('a pair game, which a lesson’s changes leave as it was', () => {
  it('still offers each player the way to end the game, and says nothing of a teacher', () => {
    renderGame(gameRoom(FEW, 7, 9), OWNER_ID);

    expect(screen.getByRole('button', { name: 'End the game' })).toBeInTheDocument();
    expect(screen.getByText('Playing with Olena')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/teacher/i);
    expect(streetOver()).not.toBeInTheDocument();
  });

  it('asks the same question of the same dialog as before', () => {
    renderGame(gameRoom(FEW, 7, 9), OWNER_ID);

    fireEvent.click(screen.getByRole('button', { name: 'End the game' }));

    const dialog = screen.getByRole('dialog', { name: 'End the game?' });

    expect(within(dialog).getByRole('button', { name: 'Keep playing' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'End it' })).toBeInTheDocument();
  });
});
