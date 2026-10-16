import Box from '@mui/material/Box';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Frame } from './Frame';
import { FrameSlotProvider } from './FrameSlotProvider';
import { useFrameSlot } from './frame-slot';
import { PillButton } from './PillButton';

/**
 * The frame's header with its slot filled: the status line a screen offers and
 * its one action, here a sample of each. The status line is not drawn under 768,
 * which is reached by narrowing the workshop's viewport and not by a prop.
 */
const SampleFiller = () => {
  useFrameSlot({
    status: 'Playing with Ana',
    action: <PillButton>End game</PillButton>,
  });

  return null;
};

const meta: Meta<typeof Frame> = {
  title: 'Components/Frame',
  component: Frame,
};

export default meta;

type Story = StoryObj<typeof Frame>;

/** A screen that has put nothing in the slot: the name alone, as a link to the home page. */
export const Empty: Story = {
  render: () => (
    <FrameSlotProvider>
      <Frame />
    </FrameSlotProvider>
  ),
};

/** A screen that has filled the slot with a status line and an action. */
export const Filled: Story = {
  render: () => (
    <FrameSlotProvider>
      <Frame />
      <SampleFiller />
      <Box sx={{ p: 4 }}>The screen stands below the header.</Box>
    </FrameSlotProvider>
  ),
};

const PlainFiller = () => {
  useFrameSlot({ status: 'Playing with Ana', plainWordmark: true });

  return null;
};

/** The lobby and the game: the name is plain text, so a stray tap cannot take a player out of the room. */
export const PlainName: Story = {
  render: () => (
    <FrameSlotProvider>
      <Frame />
      <PlainFiller />
    </FrameSlotProvider>
  ),
};
