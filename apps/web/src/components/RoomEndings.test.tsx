import { render, screen, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { theme } from '../theme';
import { type DrawnWord, FEW, gameRoom, GUEST_ID, MANY, OWNER_ID } from './drawn-room';
import { RoomClosedEarly } from './RoomClosedEarly';
import { RoomFinished } from './RoomFinished';

const answered = (words: readonly DrawnWord[]) =>
  words.map((word) => ({ ...word, isAnswered: true }));

const finished = (words: readonly DrawnWord[] = FEW, rows = 7, cols = 9) =>
  gameRoom(answered(words), rows, cols, {}, false, 'completed');

const closed = (words: readonly DrawnWord[] = FEW, rows = 7, cols = 9) =>
  gameRoom(words, rows, cols, {}, false, 'closed');

/** The eight words of `MANY`, in the order the board numbers them. */
const BOARD_ORDER = ['bread', 'engine', 'cheese', 'apple', 'dinner', 'flower', 'ribbon', 'needle'];

const FIESTA_LABEL =
  'A fiesta in the street: paper lanterns and confetti, both neighbours cheering, every word hanging on the line';
const SAG_LABEL = 'A sagging line between the balconies, holding only the words that were answered';

const inRouter = (ui: React.ReactElement) =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>{ui}</MemoryRouter>
    </ThemeProvider>,
  );

describe('the finished ending', () => {
  it('shouts "You did it!" and says how many words the two of them finished', () => {
    inRouter(<RoomFinished room={finished()} viewerId={OWNER_ID} />);

    expect(screen.getByRole('heading', { name: 'You did it!' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'You finished the crossword together: all 6 of its words, between the 2 of you.',
      ),
    ).toBeInTheDocument();
  });

  it('puts every word on a tile, in the order the board numbers them', () => {
    inRouter(<RoomFinished room={finished(MANY, 11, 11)} viewerId={OWNER_ID} />);

    const card = screen.getByRole('status', { name: 'You did it!' });

    expect(
      within(card)
        .getAllByRole('listitem')
        .map((tile) => tile.textContent),
    ).toEqual(['bread', 'engine', 'cheese', 'apple', 'dinner', 'flower', 'ribbon', 'needle']);
  });

  it('puts the tiles and the words on the line in board order whatever order the list was in', () => {
    // The list is reversed, so the order the room holds the words in is the
    // opposite of the order the board numbers them in.
    const reversed = [...MANY].reverse();

    inRouter(<RoomFinished room={finished(reversed, 11, 11)} viewerId={OWNER_ID} />);

    const card = screen.getByRole('status', { name: 'You did it!' });
    const onTheLine = [
      ...screen.getByRole('img', { name: FIESTA_LABEL }).querySelectorAll('.card'),
    ];

    expect(
      within(card)
        .getAllByRole('listitem')
        .map((tile) => tile.textContent),
    ).toEqual(BOARD_ORDER);
    expect(onTheLine.map((card) => card.textContent)).toEqual(BOARD_ORDER);
  });

  it('draws the fiesta, with every word on the line, and says so to a reader who cannot see it', () => {
    inRouter(<RoomFinished room={finished()} viewerId={GUEST_ID} />);

    const picture = screen.getByRole('img', { name: FIESTA_LABEL });

    expect(picture.querySelectorAll('.lantern').length).toBeGreaterThan(0);
    expect(picture.querySelectorAll('.confetti').length).toBeGreaterThan(0);
    expect(picture.querySelectorAll('.card')).toHaveLength(6);
  });

  it('offers a new game at the front page, and nothing else to do', () => {
    inRouter(<RoomFinished room={finished()} viewerId={OWNER_ID} />);

    expect(screen.getByRole('link', { name: 'Start a new game' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('is named "Finished" to a reader moving by headings, and shows who is in the room', () => {
    inRouter(<RoomFinished room={finished()} viewerId={OWNER_ID} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Finished' })).toBeInTheDocument();
    expect(screen.getByText('Viktor')).toBeInTheDocument();
    expect(screen.getByText('Olena')).toBeInTheDocument();
  });

  it('names no word for a room that is only marked finished, whatever it was handed', () => {
    // The screen switch sends such a room to the other ending; this is the
    // guard under it (`finishedWordsOf` reads the board and not the status).
    inRouter(
      <RoomFinished room={gameRoom(FEW, 7, 9, {}, false, 'completed')} viewerId={OWNER_ID} />,
    );

    const card = screen.getByRole('status', { name: 'You did it!' });

    expect(within(card).queryAllByRole('listitem')).toHaveLength(0);
    expect(card.textContent).not.toMatch(/engine|cheese|apple|dinner|flower/);
  });
});

describe('the ending that was cut short', () => {
  it('says what happened in the template’s words', () => {
    inRouter(<RoomClosedEarly room={closed()} viewerId={OWNER_ID} />);

    const message = screen.getByText('This game was ended early').closest('[role="status"]');

    expect(message).not.toBeNull();
    expect(
      within(message as HTMLElement).getByText('This game was ended early'),
    ).toBeInTheDocument();
    expect(
      within(message as HTMLElement).getByText(
        'It was ended before every word had been answered, and the room is closed for good. The words nobody guessed are not spelled out, apart from the ones that were yours to explain.',
      ),
    ).toBeInTheDocument();
  });

  it('is not celebrated: a sagging line, no fiesta, and no card with a shout', () => {
    inRouter(<RoomClosedEarly room={closed()} viewerId={OWNER_ID} />);

    const picture = screen.getByRole('img', { name: SAG_LABEL });

    expect(picture.querySelectorAll('.lantern')).toHaveLength(0);
    expect(picture.querySelectorAll('.confetti')).toHaveLength(0);
    expect(screen.queryByRole('heading', { name: 'You did it!' })).not.toBeInTheDocument();
  });

  it('hangs only the words that were answered, as written and not in capitals', () => {
    // The guest explains `dinner`, `flower`, `needle` and guesses `ribbon`,
    // which the grid spells in capitals.
    inRouter(<RoomClosedEarly room={closed(MANY, 11, 11)} viewerId={GUEST_ID} />);

    const picture = screen.getByRole('img', { name: SAG_LABEL });

    expect(picture.querySelectorAll('.card')).toHaveLength(2);
    expect(picture.textContent).toContain('bread');
    expect(picture.textContent).toContain('ribbon');
    expect(picture.textContent).not.toContain('RIBBON');
    expect(picture.textContent).not.toContain('apple');
  });

  it('hangs the answered words in board order whatever order the list was in', () => {
    // Reversed, so the room holds `ribbon` before `bread`. The owner explains
    // `bread` and `dinner` and guesses `apple` and `ribbon`, all four answered.
    const reversed = [...MANY]
      .reverse()
      .map((word) =>
        ['apple', 'dinner'].includes(word.word) ? { ...word, isAnswered: true } : word,
      );

    inRouter(<RoomClosedEarly room={closed(reversed, 11, 11)} viewerId={OWNER_ID} />);

    const picture = screen.getByRole('img', { name: SAG_LABEL });

    expect([...picture.querySelectorAll('.card')].map((card) => card.textContent)).toEqual([
      'bread',
      'apple',
      'dinner',
      'ribbon',
    ]);
  });

  it('says what was answered under the drawing, once', () => {
    inRouter(<RoomClosedEarly room={closed(MANY, 11, 11)} viewerId={OWNER_ID} />);

    expect(
      screen.getAllByText(
        'Of the 8 words, the ones that were answered are in place; the rest stay blank.',
      ),
    ).toHaveLength(1);
  });

  it('offers a new game at the front page, quietly', () => {
    inRouter(<RoomClosedEarly room={closed()} viewerId={OWNER_ID} />);

    expect(screen.getByRole('link', { name: 'Start a new game' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
