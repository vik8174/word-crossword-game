import type { Meta, StoryObj } from '@storybook/react-vite';

import { CreateRoomPage } from './CreateRoomPage';

/**
 * Room creation, on its own — it never reaches Firestore or Anonymous Auth in
 * a story (`.storybook/main.ts`'s Firebase alias), so `Default` shows exactly
 * what an owner sees before typing anything, and submitting the form goes
 * nowhere rather than failing loudly.
 */
const meta: Meta<typeof CreateRoomPage> = {
  title: 'Pages/CreateRoomPage',
  component: CreateRoomPage,
};

export default meta;

type Story = StoryObj<typeof CreateRoomPage>;

export const Default: Story = {};
