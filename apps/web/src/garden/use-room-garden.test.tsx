import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { RoomScreen } from '../rooms/room-screen';
import { GardenControlsContext } from './garden-controls';
import { useRoomGarden } from './use-room-garden';

/** A garden that draws nothing and answers for everything it was asked. */
const gardenAround = () => {
  const showAir = vi.fn();
  const greet = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <GardenControlsContext value={{ showAir, greet }}>{children}</GardenControlsContext>
  );

  return { showAir, greet, wrapper };
};

/** The hook, opened on one screen and free to be moved to the next. */
const openRoomOn = (kind: RoomScreen['kind']) => {
  const { showAir, greet, wrapper } = gardenAround();
  const { rerender, unmount } = renderHook(({ shown }) => useRoomGarden(shown), {
    initialProps: { shown: kind },
    wrapper,
  });

  return {
    showAir,
    greet,
    unmount,
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

  it('greets a game that was played to the end', () => {
    const room = openRoomOn('playing');

    room.becomes('finished');

    expect(room.greet).toHaveBeenCalledTimes(1);
    expect(room.showAir).toHaveBeenLastCalledWith('petals');
  });

  it('greets it once, however many times the room redraws afterwards', () => {
    const room = openRoomOn('playing');

    room.becomes('finished');
    room.becomes('finished');
    room.becomes('finished');

    expect(room.greet).toHaveBeenCalledTimes(1);
  });

  it('does not greet a finished room opened in a fresh tab', () => {
    const room = openRoomOn('connecting');

    room.becomes('finished');

    expect(room.greet).not.toHaveBeenCalled();
  });

  it('does not greet a game somebody ended with words unanswered', () => {
    const room = openRoomOn('playing');

    room.becomes('closed-early');

    expect(room.greet).not.toHaveBeenCalled();
    expect(room.showAir).toHaveBeenLastCalledWith('still');
  });

  it('gives the background back when the room is left', () => {
    const room = openRoomOn('playing');

    room.unmount();

    expect(room.showAir).toHaveBeenLastCalledWith('petals');
  });
});
