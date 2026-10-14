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
 * Every kind and prop-driven state `PillButton` carries in this app — one
 * story per row of issue #184's "What to build" table.
 *
 * `resting`, `hover`, `focus-visible` and `active` are not each a story of
 * their own: no pseudo-state addon is installed here on purpose
 * (`.storybook/main.ts`), and all three are CSS pseudo-classes any of the
 * stories below already carries — reachable by hovering, tabbing to, or
 * pressing the rendered control directly, the way an Inspector
 * drives a real browser rather than a frozen snapshot. `disabled`, `loading`
 * and `small` are prop-driven and cannot be reached that way, so each gets
 * its own story.
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

export const Primary: Story = {
  name: 'Primary (create room)',
  args: { children: 'Create room' },
};

export const PrimaryDisabled: Story = {
  name: 'Primary, disabled (create/errors)',
  args: { children: 'Create room', disabled: true },
};

export const PrimaryLoading: Story = {
  name: 'Primary, loading (create/creating)',
  args: { children: 'Creating the room...', loading: true },
};

export const Quiet: Story = {
  name: 'Quiet (edit the word list)',
  args: { kind: 'quiet', children: 'Edit the word list' },
};

export const QuietSmall: Story = {
  name: 'Quiet, small (copy link)',
  args: { kind: 'quiet', small: true, children: 'Copy link' },
};

export const Danger: Story = {
  name: 'Quiet danger (end the game)',
  args: { kind: 'quiet', danger: true, children: 'End the game' },
};

export const DangerLoading: Story = {
  name: 'Quiet danger, loading (playing/ending)',
  args: { kind: 'quiet', danger: true, loading: true, children: 'Ending the game...' },
};
