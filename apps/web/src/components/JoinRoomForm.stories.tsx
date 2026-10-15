import type { Meta, StoryObj } from '@storybook/react-vite';

import { DoorColumn, JoinStreet } from './DoorColumn';
import { JoinRoomForm } from './JoinRoomForm';

/**
 * The door into a room, on the column it stands in at the doors with the street
 * above it (`?state=join`, `join/joining` and `join/failed` of the template;
 * issue #226).
 *
 * One story per state a prop drives: resting, the join being written, and the
 * last attempt having failed. That the field is focused on arrival, and that
 * its ring shows, is reached by opening the story rather than by a prop.
 */
const meta: Meta<typeof JoinRoomForm> = {
  title: 'Components/JoinRoomForm',
  component: JoinRoomForm,
  args: { ownerNickname: 'Viktor', onJoin: () => undefined, isJoining: false },
  decorators: [
    (Story) => (
      <DoorColumn picture={<JoinStreet />}>
        <Story />
      </DoorColumn>
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
  args: { errorMessage: 'Check your connection and try again. The room is still there.' },
};
