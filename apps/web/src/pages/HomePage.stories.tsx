import type { Meta, StoryObj } from '@storybook/react-vite';

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
