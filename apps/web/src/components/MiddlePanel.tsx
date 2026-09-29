import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

import { ON_SCENE_SX } from '../garden/scene-surface';
import { middlePanelSx } from './gate-panel-styles';

interface MiddlePanelProps {
  /** Centre what is on it, as `connecting` centres its one line. */
  readonly centred?: boolean;
  /** What this screen has to say or ask. */
  readonly children: ReactNode;
}

/**
 * The panel every screen at the doors stands on while nobody is in the room
 * yet: `connecting` while it answers, `join` while the visitor picks a name,
 * and each `unavailable` while they are told why they cannot come in.
 *
 * One component for all three because the template draws one: `.middle-column`
 * is the same box in `connecting`, `join` and `unavailable/*`, and three copies
 * of it would be three chances for one of them to drift (issue #198). Where it
 * is stood is the caller's — centred in the window by `Waiting` for the two
 * screens with no room to frame, and in the frame's solo zone by `RoomShell`
 * for `join` — and it is as wide as the template's 430px or 92% of that place,
 * and as tall as what is on it.
 *
 * Its own surface rather than the band the gate's full-height column used to be,
 * which is the decision this replaces: `join` stood on the gate's band (#175)
 * and before that on a card (#137), and stands on the doors inside the room
 * frame now. Everything written on it is the forest's cream
 * ({@link ON_SCENE_SX}), and the panel is opaque enough that it need not be the
 * gate's own lighter reading: nothing on these screens renders a dimmer line.
 *
 * @param props.centred - Whether its contents are centred; left-aligned otherwise
 * @param props.children - What this screen has to say or ask
 *
 * @example
 * <MiddlePanel centred><WaitingMark>Connecting to the game…</WaitingMark></MiddlePanel>
 */
export const MiddlePanel = ({ centred = false, children }: MiddlePanelProps) => (
  <Box sx={{ ...ON_SCENE_SX, ...middlePanelSx, ...(centred && { textAlign: 'center' }) }}>
    {children}
  </Box>
);
