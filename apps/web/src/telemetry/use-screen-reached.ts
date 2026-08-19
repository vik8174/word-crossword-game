import { useEffect } from 'react';

import { type FunnelScreen, logScreenReached } from './funnel';

/**
 * Reports the screen a player is on, once for each time they arrive at it.
 *
 * What the effect watches is the screen name — a string out of four — and never
 * the object or the room a screen was worked out from. That is the whole of the
 * measurement rather than a detail of it. A room screen is rebuilt on every
 * snapshot, and a room in play receives one every fifteen seconds from each
 * client marking itself present (issue #47, `use-presence-heartbeat.ts`), so an
 * effect watching the screen object would report four arrivals a minute per
 * player at a screen nobody arrived at. A funnel made of those events would be
 * a funnel of how long people sat still, which is not what anybody would read
 * it as. It is the same dependency `usePageView` keeps for the same reason: the
 * path, not the location object.
 *
 * `null` is a screen outside the funnel, and reports nothing — leaving one is
 * not arriving anywhere.
 *
 * @param screen - The funnel screen on show, or `null` for anything else
 *
 * @example
 * useScreenReached(funnelScreenFor(screen.kind));
 */
export const useScreenReached = (screen: FunnelScreen | null): void => {
  useEffect(() => {
    if (screen === null) {
      return;
    }

    void logScreenReached(screen);
  }, [screen]);
};
