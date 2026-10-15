import { ThemeProvider } from '@mui/material/styles';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AWAY_AFTER_MS } from '../rooms/presence';
import { theme } from '../theme';
import {
  type DrawnWord,
  FEW,
  lessonRoom,
  MANY,
  OLENA_ID,
  TARAS_ID,
  TEACHER_ID,
} from './drawn-room';
import { Frame } from './Frame';
import { FrameSlotProvider } from './FrameSlotProvider';
import { RoomClosedEarly } from './RoomClosedEarly';
import { RoomFinished } from './RoomFinished';

/**
 * A lesson's two endings (`finished` and `closed-early` with `?mode=lesson` of
 * `design/templates/state-tree.html`, lines 1039-1073): the teacher's summary,
 * and the students' screens. A pair game's are `RoomEndings.test.tsx`.
 */

const CLAUSE = ', and the teacher watching from the house at the end of the street';
const FIESTA_LABEL =
  'A fiesta in the street: paper lanterns and confetti, both neighbours cheering, every word hanging on the line';

const answered = (words: readonly DrawnWord[]) =>
  words.map((word) => ({ ...word, isAnswered: true }));

const finished = (words: readonly DrawnWord[] = FEW) =>
  lessonRoom(answered(words), 7, 9, { status: 'completed' });

/** `FEW` as it stands when the teacher ends it: only `bread` has been answered. */
const closed = (silentFor: Readonly<Record<string, number>> = {}) =>
  lessonRoom(FEW, 7, 9, { status: 'closed', silentFor });

const inRouter = (ui: React.ReactElement) =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <FrameSlotProvider>
          <Frame />
          {ui}
        </FrameSlotProvider>
      </MemoryRouter>
    </ThemeProvider>,
  );

/** The rows of one student's part of the summary, as "number way / word / state". */
/** The frame's header line, where each ending says what the room did. */
const header = () => screen.getByRole('banner').querySelector('[role="status"]') as HTMLElement;

const rowsOf = (list: HTMLElement) =>
  within(list)
    .getAllByRole('listitem')
    .map((row) => row.textContent);

describe('the teacher’s Finished', () => {
  it('says "They did it!" and how many words the players finished, without a tile of them', () => {
    inRouter(<RoomFinished room={finished()} viewerId={TEACHER_ID} />);

    const card = screen.getByRole('status', { name: 'They did it!' });

    expect(card).toHaveTextContent(
      'Your players finished the crossword together: all 6 of its words.',
    );
    expect(within(card).queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.queryByText(/You did it/)).toBeNull();
  });

  it('reads "The lesson is finished" in the frame’s header', () => {
    inRouter(<RoomFinished room={finished()} viewerId={TEACHER_ID} />);

    expect(header()).toHaveTextContent('The lesson is finished');
  });

  it('summarises each student in join order: what they explained, how many were answered, and every word', () => {
    inRouter(<RoomFinished room={finished()} viewerId={TEACHER_ID} />);

    const summary = screen.getByRole('region', { name: 'Lesson summary' });
    const olena = within(summary).getByRole('heading', { name: 'Olena explained' });
    const taras = within(summary).getByRole('heading', { name: 'Taras explained' });

    expect(olena.compareDocumentPosition(taras) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(olena.parentElement).toHaveTextContent('3 of 3 answered by Taras');
    expect(taras.parentElement).toHaveTextContent('3 of 3 answered by Olena');
    expect(rowsOf(within(summary).getByRole('list', { name: 'Olena explained' }))).toEqual([
      '1 acrossbread✓ answered',
      '5 acrossdinner✓ answered',
      '6 acrossflower✓ answered',
    ]);
  });

  it('keeps no score and no winner', () => {
    inRouter(<RoomFinished room={finished()} viewerId={TEACHER_ID} />);

    const summary = screen.getByRole('region', { name: 'Lesson summary' });

    expect(summary).toHaveTextContent(
      'What each player explained, and what the other one answered. No score: the game is played together. It stays here for as long as the room does, 24 hours.',
    );
    expect(summary).not.toHaveTextContent(/score:\s*\d|winner|points/i);
  });

  it('offers "Start a new lesson", to /create with the lesson chosen, and no new game', () => {
    inRouter(<RoomFinished room={finished()} viewerId={TEACHER_ID} />);

    expect(screen.getByRole('link', { name: 'Start a new lesson' })).toHaveAttribute(
      'href',
      '/create?mode=lesson',
    );
    expect(screen.queryByRole('link', { name: 'Start a new game' })).toBeNull();
  });

  it('lists the teacher first in "In the room", tagged, with no away mark however long they were silent', () => {
    inRouter(
      <RoomFinished
        room={lessonRoom(answered(FEW), 7, 9, {
          status: 'completed',
          silentFor: { [TEACHER_ID]: AWAY_AFTER_MS * 10 },
        })}
        viewerId={TEACHER_ID}
      />,
    );

    const rows = screen
      .getAllByRole('listitem')
      .filter((row) => row.textContent?.includes('teacher'));

    expect(rows[0]).toHaveTextContent('Carmen');
    expect(rows[0]).toHaveTextContent('teacher, you');
    expect(screen.queryByText(/away for/)).toBeNull();
  });

  it('draws the fiesta with the teacher in its label exactly once', () => {
    inRouter(<RoomFinished room={finished()} viewerId={TEACHER_ID} />);

    const label = screen
      .getByRole('img', { name: FIESTA_LABEL + CLAUSE })
      .getAttribute('aria-label');

    expect(label?.split(CLAUSE)).toHaveLength(2);
  });

  it('names every answered word on the line, whoever explained it', () => {
    inRouter(<RoomFinished room={finished(MANY)} viewerId={TEACHER_ID} />);

    const line = screen.getByRole('img', { name: FIESTA_LABEL + CLAUSE });

    expect([...line.querySelectorAll('.card')].map((card) => card.textContent)).toHaveLength(8);
  });
});

describe('the teacher’s Ended early', () => {
  it('reads "The lesson was ended" and offers a quiet "Start a new lesson"', () => {
    inRouter(<RoomClosedEarly room={closed()} viewerId={TEACHER_ID} />);

    expect(header()).toHaveTextContent('The lesson was ended');
    expect(screen.getByRole('link', { name: 'Start a new lesson' })).toHaveAttribute(
      'href',
      '/create?mode=lesson',
    );
  });

  it('says which words were not answered, and how many were', () => {
    inRouter(<RoomClosedEarly room={closed()} viewerId={TEACHER_ID} />);

    const summary = screen.getByRole('region', { name: 'Lesson summary' });

    expect(
      within(summary).getByRole('heading', { name: 'Olena explained' }).parentElement,
    ).toHaveTextContent('1 of 3 answered by Taras');
    expect(
      within(summary).getByRole('heading', { name: 'Taras explained' }).parentElement,
    ).toHaveTextContent('0 of 3 answered by Olena');
    expect(rowsOf(within(summary).getByRole('list', { name: 'Olena explained' }))).toEqual([
      '1 acrossbread✓ answered',
      '5 acrossdinnernot answered',
      '6 acrossflowernot answered',
    ]);
    expect(within(summary).getAllByText('not answered')).toHaveLength(5);
  });

  it('keeps the teacher’s marking on the board, with its legend, and no line under the drawing', () => {
    inRouter(<RoomClosedEarly room={closed()} viewerId={TEACHER_ID} />);

    expect(screen.getByText(/Olena explains · /)).toBeInTheDocument();
    expect(screen.queryByText(/the rest stay blank/, { selector: 'p' })).toBeNull();
  });

  it('draws the sagging line, with only the answered words, and the teacher once in its label', () => {
    inRouter(<RoomClosedEarly room={closed()} viewerId={TEACHER_ID} />);

    const line = screen.getByRole('img', {
      name: 'A sagging line between the balconies, holding only the answered words' + CLAUSE,
    });

    expect([...line.querySelectorAll('.card')].map((card) => card.textContent)).toEqual(['bread']);
  });

  it('draws the teacher present however long they were silent', () => {
    inRouter(
      <RoomClosedEarly room={closed({ [TEACHER_ID]: AWAY_AFTER_MS * 10 })} viewerId={TEACHER_ID} />,
    );

    expect(screen.queryByText(/away for/)).toBeNull();
    expect(screen.getByRole('img', { name: /watching from the house/ })).toBeInTheDocument();
  });
});

describe('a student’s endings in a lesson', () => {
  it.each([OLENA_ID, TARAS_ID])(
    'Finished (%s) is the pair game’s fiesta, "The lesson is finished"',
    (id) => {
      inRouter(<RoomFinished room={finished()} viewerId={id} />);

      expect(screen.getByRole('heading', { name: 'You did it!' })).toBeInTheDocument();
      expect(
        screen.getByText(
          'You finished the crossword together: all 6 of its words, between the 2 of you.',
        ),
      ).toBeInTheDocument();
      expect(header()).toHaveTextContent('The lesson is finished');
      expect(screen.getByRole('link', { name: 'Start a new game' })).toHaveAttribute('href', '/');
      expect(screen.queryByRole('region', { name: 'Lesson summary' })).toBeNull();
      expect(screen.getByRole('img', { name: FIESTA_LABEL + CLAUSE })).toBeInTheDocument();
    },
  );

  it('Finished lists the teacher, present', () => {
    inRouter(
      <RoomFinished
        room={lessonRoom(answered(FEW), 7, 9, {
          status: 'completed',
          silentFor: { [TEACHER_ID]: AWAY_AFTER_MS * 10 },
        })}
        viewerId={OLENA_ID}
      />,
    );

    expect(screen.getByText('Carmen')).toBeInTheDocument();
    expect(screen.queryByText(/away for/)).toBeNull();
  });

  it('Ended early names the teacher who ended it, and says it was the teacher', () => {
    inRouter(<RoomClosedEarly room={closed()} viewerId={OLENA_ID} />);

    const message = screen.getByText('Carmen ended the lesson').closest('[role="status"]');

    expect(message).toHaveTextContent(
      'Your teacher ended it before every word had been answered, and the room is closed for good. The words nobody guessed are not spelled out, apart from the ones that were yours to explain.',
    );
    expect(screen.getByRole('link', { name: 'Start a new game' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('region', { name: 'Lesson summary' })).toBeNull();
  });

  it('Ended early reads "The lesson was ended" and draws the sagging line with the teacher once', () => {
    inRouter(<RoomClosedEarly room={closed()} viewerId={TARAS_ID} />);

    const header = screen
      .getAllByRole('status')
      .find((s) => s.textContent === 'The lesson was ended');

    expect(header).toBeDefined();
    expect(
      screen.getByRole('img', {
        name:
          'A sagging line between the balconies, holding only the words that were answered' +
          CLAUSE,
      }),
    ).toBeInTheDocument();
  });

  it('Ended early never spells out a word the viewer was meant to guess', () => {
    inRouter(<RoomClosedEarly room={closed()} viewerId={OLENA_ID} />);

    // Taras explains `engine`, `cheese` and `apple`, which are Olena's to guess.
    expect(document.body).not.toHaveTextContent(/engine|cheese|apple/);
  });
});

describe('a pair game’s endings', () => {
  it('stay as they were: no teacher in the label, no summary, a new game', async () => {
    const { gameRoom, OWNER_ID } = await import('./drawn-room');

    inRouter(
      <RoomFinished
        room={gameRoom(answered(FEW), 7, 9, {}, false, 'completed')}
        viewerId={OWNER_ID}
      />,
    );

    expect(screen.getByRole('img', { name: FIESTA_LABEL })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Lesson summary' })).toBeNull();
    expect(header()).toHaveTextContent('The game is finished');
  });
});
