import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Frame } from './Frame';
import { FrameSlotProvider } from './FrameSlotProvider';
import { PageFailed } from './PageFailed';

/**
 * The two pages a failed load and a crash end on (`?state=reload` and
 * `?state=crash` of the template, issue #294), under the frame's header as the
 * app shows them.
 */
const framed: Decorator = (Story) => (
  <FrameSlotProvider>
    <Frame />
    <Story />
  </FrameSlotProvider>
);

const meta: Meta<typeof PageFailed> = {
  title: 'Components/PageFailed',
  component: PageFailed,
  decorators: [framed],
  args: { onReload: fn(), onGoHome: fn() },
};

export default meta;

type Story = StoryObj<typeof PageFailed>;

/** `reload`: a part of the app could not be fetched and the automatic reload did not help. */
export const Reload: Story = { args: { failure: 'reload' } };

/** `crash`: an error while a screen was drawn. */
export const Crash: Story = { args: { failure: 'crash' } };
