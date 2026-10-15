import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';

import { Frame } from './Frame';
import { FrameSlotProvider } from './FrameSlotProvider';
import { RoomUnavailableNotice } from './RoomUnavailableNotice';

/**
 * Every refusal at a room's door, whole: the shuttered balcony, the card and
 * "Start a new game" (`?state=unavailable/<reason>` of the template, issue
 * #226). A story for each of the seven, because the room service is not
 * needed to reach any of them: `refused` cannot be reached live on the stage
 * project and `expired` waits 24 hours.
 */
const meta: Meta<typeof RoomUnavailableNotice> = {
  title: 'Components/RoomUnavailableNotice',
  component: RoomUnavailableNotice,
};

export default meta;

type Story = StoryObj<typeof RoomUnavailableNotice>;

/** Under the frame's header, as the app shows it. */
const framed: Decorator = (Story) => (
  <FrameSlotProvider>
    <Frame />
    <Story />
  </FrameSlotProvider>
);

export const Missing: Story = { args: { reason: 'missing' } };
export const Expired: Story = { args: { reason: 'expired' } };
export const Started: Story = { args: { reason: 'started' } };
export const Finished: Story = { args: { reason: 'finished' } };
export const Full: Story = { args: { reason: 'full' } };
export const Refused: Story = { args: { reason: 'refused' } };
export const Connection: Story = { args: { reason: 'connection' } };

/** `unavailable/full` of a lesson: a third student, sent back to their teacher. */
export const FullLesson: Story = {
  args: { reason: 'full', mode: 'lesson' },
  decorators: [framed],
};

/** `unavailable/started` of a lesson: one who comes after the deal. */
export const StartedLesson: Story = {
  args: { reason: 'started', mode: 'lesson' },
  decorators: [framed],
};
