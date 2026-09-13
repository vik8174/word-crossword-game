import type { Meta, StoryObj } from '@storybook/react-vite';

import { HomePage } from './HomePage';

/**
 * The gate, on its own — the base every later story in this project stands
 * on (`.storybook/preview.tsx`'s `decorators`, applied here without change).
 */
const meta: Meta<typeof HomePage> = {
  title: 'Pages/HomePage',
  component: HomePage,
};

export default meta;

type Story = StoryObj<typeof HomePage>;

export const Default: Story = {};
