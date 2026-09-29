import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

import {
  coreSx,
  ringSx,
  SUN_OUT_DELAYS_MS,
  WAIT_RING_CLASS,
  waitingLineSx,
  waitingRingSx,
} from './waiting-mark-styles';

interface WaitingMarkProps {
  /** What is being waited for, in a sentence. */
  readonly children: ReactNode;
}

/**
 * The template's "wait" mark and its sentence: three rings growing out of a
 * small sun (`.sun-wait` in `design/templates/state-tree.html`), replacing
 * MUI's `CircularProgress` on the `connecting` screen (issue #198).
 *
 * The one thing on the page that says "something is happening", so it announces
 * itself as a `status` for a reader who cannot see it, and the rings are
 * `aria-hidden`: they are the picture of the sentence beside them and add no
 * word to it. `CircularProgress` is still what `PageLoading` draws while a
 * route's chunk arrives, and `theme.ts` still names it out of the
 * reduced-motion freeze; the rings are named out beside it.
 *
 * @param props.children - What is being waited for
 *
 * @example
 * <WaitingMark>Connecting to the game…</WaitingMark>
 */
export const WaitingMark = ({ children }: WaitingMarkProps) => (
  <Box role="status" sx={waitingLineSx}>
    <Box aria-hidden component="span" sx={waitingRingSx}>
      {SUN_OUT_DELAYS_MS.map((delay) => (
        <Box key={delay} component="span" className={WAIT_RING_CLASS} sx={ringSx(delay)} />
      ))}
      <Box component="span" sx={coreSx} />
    </Box>
    {children}
  </Box>
);
