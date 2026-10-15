import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

import { dotSx } from './button-styles';
import { gateWaitLineSx } from './gate-panel-styles';

interface WaitingMarkProps {
  /** What is being waited for, in a sentence. */
  readonly children: ReactNode;
}

/**
 * The template's waiting line: a beating ochre dot and the sentence it waits
 * with (`.wait-line` in `design/templates/state-tree.html`, lines 256-258),
 * centred in the column on the `connecting` screen.
 *
 * The one thing on the page that says "something is happening", so it announces
 * itself as a `status` for a reader who cannot see it, and the dot is
 * `aria-hidden`. The dot is the button's own, a little larger (12px), and under
 * `prefers-reduced-motion: reduce` it does not beat: it says "busy" by being
 * there. `CircularProgress` is still what `PageLoading` draws while a route's
 * chunk arrives, and `theme.ts` still names it out of the reduced-motion freeze.
 *
 * @param props.children - What is being waited for
 *
 * @example
 * <WaitingMark>Connecting to the game…</WaitingMark>
 */
export const WaitingMark = ({ children }: WaitingMarkProps) => (
  <Box role="status" sx={gateWaitLineSx}>
    <Box aria-hidden component="span" sx={dotSx(12)} />
    {children}
  </Box>
);
