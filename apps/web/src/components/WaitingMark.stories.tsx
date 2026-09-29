import type { Meta, StoryObj } from '@storybook/react-vite';

import { MiddlePanel } from './MiddlePanel';
import { WaitingMark } from './WaitingMark';
import { gateScreenSx } from './gate-panel-styles';
import Box from '@mui/material/Box';
import { ON_SCENE_SX } from '../garden/scene-surface';

/**
 * The template's waiting mark, standing where it first does: on the doors'
 * panel, on `connecting`, the one screen whose whole message is "wait".
 *
 * It takes no prop that changes how it looks, only the sentence beside it, so
 * there is one story. The rings keep turning under `prefers-reduced-motion`
 * (`theme.ts` names them out of the freeze), which is not a story of its own:
 * it is reached by asking the system for less motion, not by a prop.
 */
const meta: Meta<typeof WaitingMark> = {
  title: 'Components/WaitingMark',
  component: WaitingMark,
  parameters: { scene: 'doors' },
  decorators: [
    (Story) => (
      <Box sx={{ ...ON_SCENE_SX, ...gateScreenSx }}>
        <MiddlePanel centred>
          <Story />
        </MiddlePanel>
      </Box>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof WaitingMark>;

export const Connecting: Story = {
  args: { children: 'Connecting to the game…' },
};
