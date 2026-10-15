import Box from '@mui/material/Box';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';

import { gapAt } from '../scale';
import { Message } from './Message';
import { gateScreenSx } from './gate-panel-styles';
import { SIDE_ZONE_WIDTH } from './room-layout';
import { fullHeightBandSx, GATE_BAND_WIDTH, TILE_SX } from './surface-styles';
import { ZONE_PADDING } from './zone-styles';

/** How far the column keeps from the edge of the band (`pages/NotFoundPage.tsx`). */
const GATE_PADDING = gapAt(4);
const GATE_COLUMN_WIDTH = `calc(${GATE_BAND_WIDTH} - ${GATE_PADDING} - ${GATE_PADDING})`;

/**
 * A tile down the middle of the window. `UnplacedWordsNotice`'s warning stands in
 * `/create`'s column (`components/gate-panel-styles.ts`) and `JoinRoomForm`'s
 * error in the doors' column (`components/DoorColumn.tsx`, issue #226), both a
 * tile, so the band is still a fair place to read a message off; it is kept
 * here rather than redrawn as either column.
 */
const GateSurface = ({ children }: { readonly children: ReactNode }) => (
  <Box sx={{ position: 'relative', minHeight: '100dvh' }}>
    <Box aria-hidden sx={fullHeightBandSx('centre', GATE_BAND_WIDTH)} />
    <Box
      sx={{ position: 'relative', width: '100%', maxWidth: GATE_COLUMN_WIDTH, mx: 'auto', pt: 5 }}
    >
      {children}
    </Box>
  </Box>
);

/**
 * The column a room's door stands in while there is no room to frame yet,
 * where `RoomUnavailableNotice`'s info reads (`components/DoorColumn.tsx`).
 */
const DoorsSurface = ({ children }: { readonly children: ReactNode }) => (
  <Box sx={gateScreenSx}>{children}</Box>
);

/**
 * A room's own side zone — the tile a success would stand in,
 * inside `RoomShell` (`components/RoomShell.tsx`'s `zoneSx`, reused at the same
 * width via `room-layout.ts`'s `SIDE_ZONE_WIDTH` rather than copied).
 */
const HallSurface = ({ children }: { readonly children: ReactNode }) => (
  <Box
    sx={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      p: 5,
    }}
  >
    <Box sx={{ ...TILE_SX, padding: ZONE_PADDING, width: SIDE_ZONE_WIDTH, maxWidth: '100%' }}>
      {children}
    </Box>
  </Box>
);

/**
 * The template's one component for every error, warning, notice and success
 * (issue #185), each kind shown on the surface it first appears on — warning
 * and error on a tile down the middle (the surface `WordListForm` and
 * `JoinRoomForm` stand on), info in the doors' column (`RoomUnavailableNotice`),
 * success in a room's side zone (no screen says one today).
 *
 * Warning is the one kind that really appears both with a list and without
 * one in this app (`WordListForm`'s validation errors and unfit words versus
 * `create/nogrid`'s plain sentence), so it alone carries both stories; the
 * other three are shown as the app actually uses them, with no list invented
 * for a kind that never carries one.
 */
const meta: Meta<typeof Message> = {
  title: 'Components/Message',
  component: Message,
};

export default meta;

type Story = StoryObj<typeof Message>;

export const WarningOnGate: Story = {
  name: 'Warning · a notice with no list',
  render: () => (
    <GateSurface>
      <Message kind="warning" heading="The room has not heard from you">
        Check your connection. This notice goes the moment the room hears from you again.
      </Message>
    </GateSurface>
  ),
};

export const WarningOnGateWithList: Story = {
  name: 'Warning · with a list (create/unplaced, some words did not fit)',
  render: () => (
    <GateSurface>
      <Message
        kind="warning"
        heading="Some words did not fit into the crossword"
        items={['rhythm', 'quartz', 'jukebox']}
      >
        These three cross nothing, so they are not in the grid. You can build the game without them,
        or go back and change the list.
      </Message>
    </GateSurface>
  ),
};

export const ErrorOnGate: Story = {
  name: 'Error · panel (could not join)',
  render: () => (
    <GateSurface>
      <Message kind="error" heading="Could not join the game">
        Check your connection and try again. The room is still there.
      </Message>
    </GateSurface>
  ),
};

export const InfoOnDoors: Story = {
  name: 'Info · panel (room unavailable)',
  render: () => (
    <DoorsSurface>
      <Message kind="info" heading="This room has expired">
        Rooms are kept for 24 hours after they are created, and this one is past that, so nobody can
        join it any more. Ask whoever invited you to start a new game.
      </Message>
    </DoorsSurface>
  ),
};

export const SuccessOnHall: Story = {
  name: 'Success · zone (every word is in)',
  render: () => (
    <HallSurface>
      <Message kind="success" heading="Every word is in" role="status">
        You finished the crossword together: all 12 of its words, between the 2 of you.
      </Message>
    </HallSurface>
  ),
};
