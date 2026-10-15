import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RoomShell, ZONE_RING_ROOM_PX } from './RoomShell';
import { APP_SHELL, ARRANGED_ROOM } from './room-layout';
import { OUTLINE_WIDTH } from './surface-styles';

/** What the stylesheet declares for an element inside a media query. */
const declaredIn = (query: string, element: Element): string => {
  const sheet = [...document.querySelectorAll('style')]
    .map((style) => style.textContent ?? '')
    .join('\n');
  // The stylesheet writes a list of queries without a space after the comma.
  const escaped = query.replace(/, /g, ',').replace(/[().*+?^${}|[\]\\]/g, '\\$&');

  return [...element.classList]
    .map((name) => new RegExp(`${escaped}\\{\\.${name}\\{([^}]*)\\}`).exec(sheet))
    .map((match) => match?.[1] ?? '')
    .join(';');
};

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

  describe('where a zone scrolls, in an application', () => {
    const declaredInAppShell = (element: Element): string => declaredIn(APP_SHELL, element);

    it('leaves room round what stands at its edge for the ring a message draws outside its box', () => {
      // A message's ring is an outer shadow, and a scroll container clips
      // whatever is outside its padding box. With no padding on the zone every
      // message at its edge lost the top, left and right of its ring (issue
      // #228, round 1), so the scroll box is padded by more than the ring is
      // thick and pulled out by the same amount, which leaves the content where
      // the drawing puts it.
      render(
        <RoomShell left={<p>a message at the zone’s edge</p>} right={<p>and one on the right</p>}>
          <p>the board</p>
        </RoomShell>,
      );

      expect(ZONE_RING_ROOM_PX).toBeGreaterThanOrEqual(OUTLINE_WIDTH);

      for (const text of ['a message at the zone’s edge', 'and one on the right', 'the board']) {
        const scrollBox = screen.getByText(text).parentElement as HTMLElement;
        const rules = declaredInAppShell(scrollBox);

        expect(rules).toContain('overflow-y:auto');
        expect(rules).toContain(`padding:${ZONE_RING_ROOM_PX}px`);
        expect(rules).toContain(`margin:-${ZONE_RING_ROOM_PX}px`);
      }
    });

    it('keeps the cell the zone stands in free of any clipping, so the ring has somewhere to go', () => {
      render(<RoomShell left={<p>yours to explain</p>}>the board</RoomShell>);

      const cell = screen.getByText('yours to explain').parentElement?.parentElement as HTMLElement;

      expect(declaredInAppShell(cell)).not.toMatch(/overflow/);
      expect(getComputedStyle(cell).overflow).not.toMatch(/auto|hidden|scroll/);
    });
  });
  describe('a tablet too short to be an application (issue #274)', () => {
    it('lays the zones out in the tablet’s arrangement from 600 high, with no scroll box and no fixed height', () => {
      render(
        <RoomShell left={<p>yours to explain</p>} right={<p>yours to guess</p>}>
          <p>the board</p>
        </RoomShell>,
      );

      const main = screen.getByRole('main');
      const frame = main.parentElement as HTMLElement;
      const zone = screen.getByText('yours to explain').parentElement as HTMLElement;

      // The arrangement, asked for by the window's size alone.
      expect(declaredIn(ARRANGED_ROOM, main)).toContain('grid-template-columns:1fr 1fr');
      expect(declaredIn(ARRANGED_ROOM, main)).toContain(
        'grid-template-areas:"board board" "left right"',
      );
      // What only an application has: the fixed height, the row that takes what
      // the board leaves, and the scroll box.
      expect(declaredIn(ARRANGED_ROOM, frame)).not.toMatch(/height|overflow/);
      expect(declaredIn(ARRANGED_ROOM, main)).not.toMatch(/minmax|flex:1/);
      expect(declaredIn(ARRANGED_ROOM, zone)).not.toMatch(/overflow/);
      expect(declaredIn(APP_SHELL, frame)).toContain('overflow:hidden');
      expect(declaredIn(APP_SHELL, main)).toContain('grid-template-rows:auto minmax(0, 1fr)');
    });
  });

  describe('on a phone, where the zones stand one under the other', () => {
    /** The `order` the zone round some content is laid out in: the page's own, before any width is asked. */
    const orderOf = (content: string): string =>
      getComputedStyle(screen.getByText(content).parentElement?.parentElement as HTMLElement).order;

    it('puts what a player gets back first, since it is what they wait on', () => {
      render(
        <RoomShell left={<p>yours to explain</p>} right={<p>yours to guess</p>}>
          <p>the board</p>
        </RoomShell>,
      );

      expect(orderOf('the board')).toBe('-1');
      expect(orderOf('yours to guess')).toBe('1');
      expect(orderOf('yours to explain')).toBe('2');
    });

    it('reads the teacher’s two zones left then right (`.zones.teacher`)', () => {
      render(
        <RoomShell isTeachers left={<p>olena explains</p>} right={<p>taras explains</p>}>
          <p>the board</p>
        </RoomShell>,
      );

      expect(orderOf('the board')).toBe('-1');
      expect(orderOf('olena explains')).toBe('1');
      expect(orderOf('taras explains')).toBe('2');
    });
  });
});
