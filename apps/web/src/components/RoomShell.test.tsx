import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RoomShell } from './RoomShell';
import { ShiftRoleContext } from './screen-shift';

describe('RoomShell', () => {
  it('names the room once, whatever the room is doing', () => {
    render(<RoomShell>the board</RoomShell>);

    // One frame for all five screens means one heading for the page, and a
    // second would be a second page as far as a reader moving by headings is
    // concerned.
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Game room');
  });

  it('keeps what the room is doing, and the one thing to do about it, in the header', () => {
    render(
      <RoomShell status={<p>The game is on.</p>} action={<button>End the game</button>}>
        the board
      </RoomShell>,
    );

    const header = within(screen.getByRole('banner'));

    expect(header.getByText('The game is on.')).toBeInTheDocument();
    expect(header.getByRole('button', { name: 'End the game' })).toBeInTheDocument();
  });

  it('reads left to right the way the screen does — what is given, the board, what comes back', () => {
    render(
      <RoomShell left={<p>yours to explain</p>} right={<p>yours to guess</p>}>
        <p>the board</p>
      </RoomShell>,
    );

    // The order the elements are in is the order they are laid out in and the
    // order they are read in: a reader who cannot see the three zones is walked
    // through the game in the same direction as one who can.
    expect(screen.getByRole('main').textContent).toBe('yours to explainthe boardyours to guess');
  });

  it('leaves a zone this screen has nothing for empty rather than filling it', () => {
    // A lobby has dealt no words out, so the side that holds them has nothing
    // to say — and says nothing, instead of the board sliding across to take
    // the space.
    render(<RoomShell right={<p>who is here</p>}>the board</RoomShell>);

    expect(screen.getByRole('main').textContent).toBe('the boardwho is here');
  });

  it('gives up its header to the screen replacing it', () => {
    render(
      <ShiftRoleContext value="leaving">
        <RoomShell status={<p>The game is on.</p>}>the board</RoomShell>
      </ShiftRoleContext>,
    );

    // While a shift runs there are two of these on the page, one over the
    // other. Two headers in the same place would print over each other, and the
    // header is the part that is meant to stand still — so the screen on its
    // way out lets the arriving one's stand (issue #93).
    expect(screen.queryByRole('banner')).toBeNull();
    expect(screen.getByRole('banner', { hidden: true })).not.toBeVisible();
    expect(screen.getByRole('main')).toBeVisible();
  });
});
