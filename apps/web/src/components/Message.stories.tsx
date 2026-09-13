import Box from '@mui/material/Box';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';

import { fullHeightBandSx, GATE_BAND_WIDTH, ON_SCENE_SX } from '../garden/scene-surface';
import { gapAt } from '../scale';
import { Message } from './Message';
import { SIDE_ZONE_WIDTH } from './room-layout';

/** How far the gate's own column keeps from the edge of the band (`pages/CreateRoomPage.tsx`). */
const GATE_PADDING = gapAt(4);
const GATE_COLUMN_WIDTH = `calc(${GATE_BAND_WIDTH} - ${GATE_PADDING} - ${GATE_PADDING})`;

/**
 * The gate's own band, standing exactly as `CreateRoomPage` stands its form on
 * it — the surface `WordListForm`'s warning and `JoinRoomForm`'s error both
 * really stand on, since `join` claims the same band `/create` does
 * (`garden/use-room-garden.ts`'s `sceneFor`).
 */
const GateSurface = ({ children }: { readonly children: ReactNode }) => (
  <Box sx={{ position: 'relative', minHeight: '100dvh', ...ON_SCENE_SX }}>
    <Box aria-hidden sx={fullHeightBandSx('centre', GATE_BAND_WIDTH)} />
    <Box
      sx={{ position: 'relative', width: '100%', maxWidth: GATE_COLUMN_WIDTH, mx: 'auto', pt: 5 }}
    >
      {children}
    </Box>
  </Box>
);

/**
 * The centred column a room stands a notice in while there is no room to
 * frame yet — `pages/RoomPage.tsx`'s own `Waiting`, reused at the same width
 * rather than redrawn, since that is exactly where `RoomUnavailableNotice`'s
 * info reads stand.
 */
const DoorsSurface = ({ children }: { readonly children: ReactNode }) => (
  <Box
    sx={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      p: 5,
      ...ON_SCENE_SX,
    }}
  >
    <Box sx={{ maxWidth: '32rem', width: '100%' }}>{children}</Box>
  </Box>
);

/**
 * A room's own side zone — the band `GameCompletedPanel`'s success stands in,
 * inside `RoomShell` (`components/RoomShell.tsx`'s `zoneSx`, reused at the
 * same width via `room-layout.ts`'s `SIDE_ZONE_WIDTH` rather than copied).
 */
const HallSurface = ({ children }: { readonly children: ReactNode }) => (
  <Box
    sx={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      p: 5,
      ...ON_SCENE_SX,
    }}
  >
    <Box sx={{ width: SIDE_ZONE_WIDTH, maxWidth: '100%' }}>{children}</Box>
  </Box>
);

/**
 * The template's one component for every error, warning, notice and success
 * (issue #185), each kind shown over the scene it first appears on — warning
 * and error inside the gate's own band (the surface `WordListForm` and
 * `JoinRoomForm` stand on), info in the doors' centred column
 * (`RoomUnavailableNotice`), success in a room's side zone
 * (`GameCompletedPanel`).
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
  name: 'Warning · gate (no crossword)',
  parameters: { scene: 'gate' },
  render: () => (
    <GateSurface>
      <Message kind="warning" heading="No crossword can be built">
        None of these words cross each other. Add or change a few words — words that share letters
        can cross.
      </Message>
    </GateSurface>
  ),
};

export const WarningOnGateWithList: Story = {
  name: 'Warning · gate, with a list (the list needs a change)',
  parameters: { scene: 'gate' },
  render: () => (
    <GateSurface>
      <Message
        kind="warning"
        heading="The list needs a change"
        items={['"apple" appears twice', '"a" is shorter than three letters']}
      >
        Fix these before the game can be built:
      </Message>
    </GateSurface>
  ),
};

export const ErrorOnGate: Story = {
  name: 'Error · gate (could not join)',
  parameters: { scene: 'gate' },
  render: () => (
    <GateSurface>
      <Message kind="error" heading="Could not join the game">
        Check your connection and try again — the room is still there.
      </Message>
    </GateSurface>
  ),
};

export const InfoOnDoors: Story = {
  name: 'Info · doors (room unavailable)',
  parameters: { scene: 'doors' },
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
  name: 'Success · hall (every word is in)',
  parameters: { scene: 'hall' },
  render: () => (
    <HallSurface>
      <Message kind="success" heading="Every word is in" role="status">
        You finished the crossword together — all 12 of its words, between the 2 of you.
      </Message>
    </HallSurface>
  ),
};
