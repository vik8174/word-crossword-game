import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RoomShell } from './RoomShell';

describe('RoomShell', () => {
  it('names the room once, whatever the room is doing', () => {
    render(<RoomShell>the board</RoomShell>);

    // One frame for all five screens means one heading for the page, and a
    // second would be a second page as far as a reader moving by headings is
    // concerned.
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Game room');
  });

  it('draws no header of its own: the status and the action are the frame’s', () => {
    render(<RoomShell>the board</RoomShell>);

    // The header is drawn once by the frame, for every screen
    // (`useFrameSlot`); a second one here would be a banner inside a page that
    // already has one.
    expect(screen.queryByRole('banner')).toBeNull();
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

  it('lays a zone on the ground, with no tile behind it', () => {
    render(
      <RoomShell left={<p>yours to explain</p>}>
        <p>the board</p>
      </RoomShell>,
    );

    // The drawing sets no surface behind a zone: `.zone` has no rule of its
    // own, only `.zones` lays the three out.
    const style = getComputedStyle(
      screen.getByText('yours to explain').parentElement as HTMLElement,
    );

    expect(style.backgroundColor).not.toBe('rgb(250, 251, 250)');
    expect(style.outline).not.toMatch(/solid/);
    expect(style.borderTopWidth).not.toBe('1.5px');
  });

  it('leaves a zone this screen has nothing for empty rather than filling it', () => {
    // A lobby has dealt no words out, so the side that holds them has nothing
    // to say — and says nothing, instead of the board sliding across to take
    // the space.
    render(<RoomShell right={<p>who is here</p>}>the board</RoomShell>);

    expect(screen.getByRole('main').textContent).toBe('the boardwho is here');
  });

  it('stands the frame the way the template draws it, on a phone: 24 above, 40 below, 18 either side', () => {
    render(<RoomShell>the board</RoomShell>);

    const frame = screen.getByRole('main').parentElement;

    expect(frame).toHaveStyle({ padding: '24px 18px 40px' });
  });

  it('is at least what the frame’s header leaves of a window on a phone whatever it holds', () => {
    render(<RoomShell>the board</RoomShell>);

    expect(screen.getByRole('main').parentElement).toHaveStyle({
      minHeight: 'calc(100dvh - var(--frame-header-height, 64px))',
    });
  });
});
