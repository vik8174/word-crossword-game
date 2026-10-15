import { ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { RoomUnavailableReason } from '../rooms/room-screen';
import { theme } from '../theme';
import { RoomUnavailableNotice } from './RoomUnavailableNotice';

const HEADINGS: readonly (readonly [RoomUnavailableReason, string])[] = [
  ['missing', 'There is no game at this link'],
  ['expired', 'This room has expired'],
  ['started', 'This game has already begun'],
  ['finished', 'This game is over'],
  ['full', 'The room is full'],
  ['refused', 'The room would not take you in'],
  ['connection', 'Could not reach the game'],
];

const renderNotice = (reason: RoomUnavailableReason) =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <RoomUnavailableNotice reason={reason} />
      </MemoryRouter>
    </ThemeProvider>,
  );

describe('RoomUnavailableNotice', () => {
  it.each(HEADINGS)(
    'says %s in its own words, and leads on to a game of their own',
    (reason, heading) => {
      renderNotice(reason);

      expect(screen.getByRole('alert')).toHaveTextContent(heading);
      expect(screen.getByRole('link', { name: 'Start a new game' })).toHaveAttribute('href', '/');
    },
  );

  it.each(HEADINGS)('draws the shuttered balcony above the %s card', (reason) => {
    renderNotice(reason);

    expect(
      screen.getByRole('img', { name: 'A balcony across the street with its shutters closed' }),
    ).toBeInTheDocument();
  });

  it('draws only the connection failure as an error', () => {
    renderNotice('connection');

    expect(screen.getByRole('alert')).toHaveTextContent('×');
  });

  it.each(HEADINGS)('writes %s without a dash in the middle of a sentence', (reason) => {
    renderNotice(reason);

    expect(screen.getByRole('alert')).not.toHaveTextContent('—');
  });

  it('is named to a reader as the page, since the card has no heading of its own', () => {
    renderNotice('missing');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Game room');
  });
});
