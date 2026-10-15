import Box from '@mui/material/Box';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';

import { PillButton } from './PillButton';

/**
 * Centres a control on the ground, `duck`, which the decorator paints behind
 * every story.
 */
const Stage = ({ children }: { readonly children: ReactNode }) => (
  <Box
    sx={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {children}
  </Box>
);

/**
 * Every look `PillButton` has, each beside the template state that draws it
 * (`design/templates/state-tree.html`): loud with `home`, quiet with
 * `create/unplaced`, link with `playing`, disabled with `create/errors`,
 * loading with `create/creating`.
 *
 * Hover, focus and press are CSS pseudo-classes any story carries and are not
 * stories of their own; `disabled` and `loading` are prop-driven and are.
 */
const meta: Meta<typeof PillButton> = {
  title: 'Components/PillButton',
  component: PillButton,
  decorators: [
    (Story) => (
      <Stage>
        <Story />
      </Stage>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof PillButton>;

export const Loud: Story = {
  name: 'Loud (home: Create a game)',
  args: { children: 'Create a game' },
};

export const Quiet: Story = {
  name: 'Quiet (create/unplaced: Back)',
  args: { kind: 'quiet', children: 'Back' },
};

export const Link: Story = {
  name: 'Link (playing: End the game)',
  args: { kind: 'link', children: 'End the game' },
};

export const Disabled: Story = {
  name: 'Disabled (create/errors: Create room)',
  args: { children: 'Create room', disabled: true },
};

export const Loading: Story = {
  name: 'Loading (create/creating)',
  args: { children: 'Creating the room...', loading: true },
};
