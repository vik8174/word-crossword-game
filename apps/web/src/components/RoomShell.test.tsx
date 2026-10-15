import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { theme } from '../theme';
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

  it('lays a zone with something in it on a tile, outlined inside its own box', () => {
    render(
      <RoomShell left={<p>yours to explain</p>}>
        <p>the board</p>
      </RoomShell>,
    );

    const zone = screen.getByText('yours to explain').parentElement as HTMLElement;
    const style = getComputedStyle(zone);

    expect(style.backgroundColor).toBe('rgb(250, 251, 250)');
    expect(theme.palette.street.tile).toBe('#FAFBFA');
    // The 1.5px rule along its top edge is kept as a border, so the content of
    // the zone stands where it did when the rule was red; the rest of the
    // outline is drawn inside the box.
    expect(style.borderTopWidth).toBe('1.5px');
    expect(style.borderTopColor).toBe('rgb(195, 208, 205)');
    expect(theme.palette.street.line).toBe('#C3D0CD');
    expect(style.outline.toLowerCase()).toBe(
      `1.5px solid ${theme.palette.street.line}`.toLowerCase(),
    );
    // No blur over a picture, and no shadow under the zone.
    expect(['', 'none']).toContain(style.backdropFilter);
    expect(['', 'none']).toContain(style.boxShadow);
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

  it('stands the frame the way the template draws it, on a phone: 20 above, 24 below, 16 apart', () => {
    render(<RoomShell>the board</RoomShell>);

    const frame = screen.getByRole('main').parentElement;

    expect(frame).toHaveStyle({ padding: '20px 16px 24px', gap: '1rem' });
  });

  it('is at least what the frame’s header leaves of a window on a phone whatever it holds', () => {
    render(<RoomShell>the board</RoomShell>);

    expect(screen.getByRole('main').parentElement).toHaveStyle({
      minHeight: 'calc(100dvh - var(--frame-header-height, 64px))',
    });
  });
});
