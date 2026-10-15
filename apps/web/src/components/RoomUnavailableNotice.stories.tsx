import type { Meta, StoryObj } from '@storybook/react-vite';

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

export const Missing: Story = { args: { reason: 'missing' } };
export const Expired: Story = { args: { reason: 'expired' } };
export const Started: Story = { args: { reason: 'started' } };
export const Finished: Story = { args: { reason: 'finished' } };
export const Full: Story = { args: { reason: 'full' } };
export const Refused: Story = { args: { reason: 'refused' } };
export const Connection: Story = { args: { reason: 'connection' } };
