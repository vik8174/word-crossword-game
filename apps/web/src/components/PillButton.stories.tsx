import Box from '@mui/material/Box';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';

import { ON_SCENE_SX } from '../garden/scene-surface';
import { PillButton } from './PillButton';

/**
 * Centres a control over whichever scene the story picks, the same way
 * `Message.stories.tsx`'s own surfaces stand over one — `ON_SCENE_SX` for
 * nothing but the veiled picture underneath, since every colour `PillButton`
 * draws is its own rather than read off that rule.
 */
const Stage = ({ children }: { readonly children: ReactNode }) => (
  <Box
    sx={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...ON_SCENE_SX,
    }}
  >
    {children}
  </Box>
);

/**
 * Every kind and prop-driven state `PillButton` carries in this app — one
 * story per row of issue #184's "What to build" table, on the scene its
 * first screen stands on (primary and quiet on `gate`, danger on `hall`).
 *
 * `resting`, `hover`, `focus-visible` and `active` are not each a story of
 * their own: no pseudo-state addon is installed here on purpose
 * (`.storybook/main.ts`), and all three are CSS pseudo-classes any of the
 * stories below already carries — reachable by hovering, tabbing to, or
 * pressing the rendered control directly, the way `.claude/agents/inspector.md`
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
  name: 'Primary · gate (create room)',
  parameters: { scene: 'gate' },
  args: { children: 'Create room' },
};

export const PrimaryDisabled: Story = {
  name: 'Primary · gate, disabled (create/errors)',
  parameters: { scene: 'gate' },
  args: { children: 'Create room', disabled: true },
};

export const PrimaryLoading: Story = {
  name: 'Primary · gate, loading (create/creating)',
  parameters: { scene: 'gate' },
  args: { children: 'Creating the room...', loading: true },
};

export const Quiet: Story = {
  name: 'Quiet · gate (edit the word list)',
  parameters: { scene: 'gate' },
  args: { kind: 'quiet', children: 'Edit the word list' },
};

export const QuietSmall: Story = {
  name: 'Quiet · gate, small (copy link)',
  parameters: { scene: 'gate' },
  args: { kind: 'quiet', small: true, children: 'Copy link' },
};

export const Danger: Story = {
  name: 'Quiet danger · hall (end the game)',
  parameters: { scene: 'hall' },
  args: { kind: 'quiet', danger: true, children: 'End the game' },
};

export const DangerLoading: Story = {
  name: 'Quiet danger · hall, loading (playing/ending)',
  parameters: { scene: 'hall' },
  args: { kind: 'quiet', danger: true, loading: true, children: 'Ending the game...' },
};
