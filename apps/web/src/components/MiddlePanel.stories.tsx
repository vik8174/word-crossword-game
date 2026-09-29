import Box from '@mui/material/Box';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ON_SCENE_SX } from '../garden/scene-surface';
import { gateScreenSx } from './gate-panel-styles';
import { JoinRoomForm } from './JoinRoomForm';
import { MiddlePanel } from './MiddlePanel';
import { WaitingMark } from './WaitingMark';

/**
 * The screen the panel stands in: the same window-sized grid `Waiting` centres
 * it in for `connecting` and `unavailable` (`components/gate-panel-styles.ts`'s
 * `gateScreenSx`), over the doors, which is the picture all three screens that
 * use it stand in front of.
 */
const Screen = ({ children }: { readonly children: React.ReactNode }) => (
  <Box sx={{ ...ON_SCENE_SX, ...gateScreenSx }}>{children}</Box>
);

/**
 * The panel every screen at the doors stands on (issue #198): `join` while the
 * visitor picks a name, `connecting` while it answers, and every `unavailable`.
 *
 * Its one prop is whether what is on it is centred, and that is the whole of
 * what makes the second story different from the first; the width, the surface
 * and the padding are the template's own and do not change.
 */
const meta: Meta<typeof MiddlePanel> = {
  title: 'Components/MiddlePanel',
  component: MiddlePanel,
  parameters: { scene: 'doors' },
  decorators: [
    (Story) => (
      <Screen>
        <Story />
      </Screen>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof MiddlePanel>;

export const WithAForm: Story = {
  name: 'Left-aligned · a form (join)',
  render: () => (
    <MiddlePanel>
      <JoinRoomForm onJoin={() => undefined} isJoining={false} />
    </MiddlePanel>
  ),
};

export const Centred: Story = {
  name: 'Centred · the waiting line (connecting)',
  render: () => (
    <MiddlePanel centred>
      <WaitingMark>Connecting to the game…</WaitingMark>
    </MiddlePanel>
  ),
};
