import type { Meta, StoryObj } from '@storybook/react-vite';

import { ConnectingStreet, DoorColumn } from './DoorColumn';
import { WaitingMark } from './WaitingMark';

/**
 * The template's waiting line, standing where it first does: under the street,
 * on `connecting`, the one screen whose whole message is "wait"
 * (`?state=connecting`, issue #226).
 *
 * It takes no prop that changes how it looks, only the sentence beside it, so
 * there is one story. The dot stands still under `prefers-reduced-motion`,
 * which is reached by asking the system for less motion, not by a prop.
 */
const meta: Meta<typeof WaitingMark> = {
  title: 'Components/WaitingMark',
  component: WaitingMark,
  decorators: [
    (Story) => (
      <DoorColumn picture={<ConnectingStreet />}>
        <Story />
      </DoorColumn>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof WaitingMark>;

export const Connecting: Story = {
  args: { children: 'Connecting to the game…' },
};
