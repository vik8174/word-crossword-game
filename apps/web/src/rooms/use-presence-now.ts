import { useEffect, useState } from 'react';

import { PRESENCE_TICK_MS } from './presence';

/**
 * The moment, re-read on the presence clock, so silence can be noticed.
 *
 * What makes somebody away is a write that did **not** happen, and no snapshot
 * carries that: a screen that judged marks against the moment of its last render
 * would go on showing a room as it stood when the last snapshot landed. This is
 * the clock {@link useRoomPresence} reads the room's marks against, and the one
 * a door reads a lesson's teacher against, so a screen on which nobody is
 * writing still notices that they have stopped.
 *
 * @returns The current moment, replaced every {@link PRESENCE_TICK_MS}
 *
 * @example
 * const now = usePresenceNow();
 */
export const usePresenceNow = (): Date => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), PRESENCE_TICK_MS);

    return () => clearInterval(timer);
  }, []);

  return now;
};
