import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { RoomScreen } from '../rooms/room-screen';
import { GardenControlsContext } from './garden-controls';
import { useRoomGarden } from './use-room-garden';

/** A garden that draws nothing and answers for everything it was asked. */
const gardenAround = () => {
  const showAir = vi.fn();
  const showScene = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <GardenControlsContext value={{ showAir, showScene }}>{children}</GardenControlsContext>
  );

  return { showAir, showScene, wrapper };
};

/** The hook, opened on one screen and free to be moved to the next. */
const openRoomOn = (kind: RoomScreen['kind']) => {
  const { showAir, showScene, wrapper } = gardenAround();
  const { result, rerender, unmount } = renderHook(({ shown }) => useRoomGarden(shown), {
    initialProps: { shown: kind },
    wrapper,
  });

  return {
    showAir,
    showScene,
    unmount,
    hasEnded: () => result.current,
    becomes: (next: RoomScreen['kind']) => rerender({ shown: next }),
  };
};

describe('useRoomGarden', () => {
  it('puts petals behind a lobby', () => {
    const { showAir } = openRoomOn('lobby');

    expect(showAir).toHaveBeenLastCalledWith('petals');
  });

  it('stills the background when the words are dealt', () => {
    const room = openRoomOn('lobby');

    room.becomes('playing');

    expect(room.showAir).toHaveBeenLastCalledWith('still');
  });

  it('says a game was played to the end, so the room can lay the cloth', () => {
    const room = openRoomOn('playing');

    expect(room.hasEnded()).toBe(false);

    room.becomes('finished');

    expect(room.hasEnded()).toBe(true);
  });

  it('goes on saying it, however many times the room redraws afterwards', () => {
    // A room redraws roughly every seven seconds all game, and the cloth is
    // laid once and then stays until the player leaves for the gate.
    const room = openRoomOn('playing');

    room.becomes('finished');
    room.becomes('finished');
    room.becomes('finished');

    expect(room.hasEnded()).toBe(true);
  });

  it('says nothing about a finished room opened in a fresh tab', () => {
    // `finished` is true forever, a completed room being terminal, so an ending
    // keyed on the screen would play again on every reload and in every tab
    // opened an hour later.
    const room = openRoomOn('connecting');

    room.becomes('finished');

    expect(room.hasEnded()).toBe(false);
  });

  it('says nothing about a game somebody ended with words unanswered', () => {
    const room = openRoomOn('playing');

    room.becomes('closed-early');

    expect(room.hasEnded()).toBe(false);
    expect(room.showAir).toHaveBeenLastCalledWith('still');
  });

  it('stands the window at the doors while waiting on the room to say what it is', () => {
    // `connecting` and `unavailable` are both the threshold: a visitor who has
    // not been let in yet, rather than a visitor still outside the gate.
    expect(openRoomOn('connecting').showScene).toHaveBeenLastCalledWith('doors');
    expect(openRoomOn('unavailable').showScene).toHaveBeenLastCalledWith('doors');
  });

  it('stands the nickname form at the gate, the same picture home and create share', () => {
    expect(openRoomOn('join').showScene).toHaveBeenLastCalledWith('gate');
  });

  it('moves the window to the doors for a lobby and into the hall for a game', () => {
    const room = openRoomOn('lobby');

    expect(room.showScene).toHaveBeenLastCalledWith('doors');

    room.becomes('playing');

    expect(room.showScene).toHaveBeenLastCalledWith('hall');
  });

  it('keeps the hall up when a finished game is answered', () => {
    // The reward is a cloth laid over the same table, not a journey out of it —
    // `finished` shows the same picture `playing` did.
    const room = openRoomOn('playing');

    room.becomes('finished');

    expect(room.showScene).toHaveBeenLastCalledWith('hall');
  });

  it('gives the background back when the room is left', () => {
    const room = openRoomOn('playing');

    room.unmount();

    expect(room.showAir).toHaveBeenLastCalledWith('petals');
    expect(room.showScene).toHaveBeenLastCalledWith('gate');
  });
});
