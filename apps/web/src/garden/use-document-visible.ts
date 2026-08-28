import { useEffect, useState } from 'react';

/** Whether this document is the one its tab is showing. */
const isShowing = (): boolean => document.visibilityState !== 'hidden';

/**
 * Whether anybody is looking at this tab.
 *
 * It exists for one cost: a guest opens an invite link and goes to make tea,
 * and a `requestAnimationFrame` running behind that tab warms their phone for
 * the length of a game. Movement sleeps while the tab is not being looked at
 * (`docs/decisions/0030-where-movement-is-allowed.md`), and the price of that is
 * accepted knowingly — somebody who comes back to a tab after the game ended
 * finds a calm result, the greeting having been asleep when it would have
 * played.
 *
 * @returns Whether the tab is in front
 *
 * @example
 * const isAwake = useDocumentVisible();
 */
export const useDocumentVisible = (): boolean => {
  const [showing, setShowing] = useState(isShowing);

  useEffect(() => {
    const answer = () => setShowing(isShowing());

    document.addEventListener('visibilitychange', answer);

    return () => document.removeEventListener('visibilitychange', answer);
  }, []);

  return showing;
};
