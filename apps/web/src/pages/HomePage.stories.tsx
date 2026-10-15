import type { Meta, StoryObj } from '@storybook/react-vite';

import { Frame } from '../components/Frame';
import { FrameSlotProvider } from '../components/FrameSlotProvider';
import { HomePage } from './HomePage';

/**
 * Home, on its own (`?state=home` of the state tree), on the ground every story
 * stands on (`.storybook/preview.tsx`'s `decorators`).
 */
const meta: Meta<typeof HomePage> = {
  title: 'Pages/HomePage',
  component: HomePage,
};

export default meta;

type Story = StoryObj<typeof HomePage>;

export const Default: Story = {};

/**
 * Home under the frame's header, as the app shows it: the same page, with the
 * hint that a lesson can be run under the action (template line 841).
 */
export const UnderTheFrame: Story = {
  decorators: [
    (Story) => (
      <FrameSlotProvider>
        <Frame />
        <Story />
      </FrameSlotProvider>
    ),
  ],
};
