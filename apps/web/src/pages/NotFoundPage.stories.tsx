import type { Meta, StoryObj } from '@storybook/react-vite';

import { NotFoundPage } from './NotFoundPage';

/** The page for an address the app knows nothing about, drawn as a refusal (issue #226). */
const meta: Meta<typeof NotFoundPage> = {
  title: 'Pages/NotFoundPage',
  component: NotFoundPage,
};

export default meta;

type Story = StoryObj<typeof NotFoundPage>;

export const Default: Story = {};
