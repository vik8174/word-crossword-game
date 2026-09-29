import Box from '@mui/material/Box';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ON_SCENE_SX } from '../garden/scene-surface';
import { gateScreenSx } from './gate-panel-styles';
import { JoinRoomForm } from './JoinRoomForm';
import { MiddlePanel } from './MiddlePanel';

/**
 * The nickname form, on the panel it stands on at the doors (issue #198).
 *
 * One story per state a prop drives: resting, the join being written, and the
 * last attempt having failed. That the field is focused on arrival, and that
 * its ring shows, is reached by opening the story rather than by a prop.
 */
const meta: Meta<typeof JoinRoomForm> = {
  title: 'Components/JoinRoomForm',
  component: JoinRoomForm,
  args: { onJoin: () => undefined, isJoining: false },
  parameters: { scene: 'doors' },
  decorators: [
    (Story) => (
      <Box sx={{ ...ON_SCENE_SX, ...gateScreenSx }}>
        <MiddlePanel>
          <Story />
        </MiddlePanel>
      </Box>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof JoinRoomForm>;

export const Resting: Story = {};

export const Joining: Story = {
  args: { isJoining: true },
};

export const Failed: Story = {
  args: { errorMessage: 'Check your connection and try again — the room is still there.' },
};
