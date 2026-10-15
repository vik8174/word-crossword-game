import Box from '@mui/material/Box';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CrosswordLayout } from 'shared';

import { gateScreenSx } from './gate-panel-styles';
import { UnplacedWordsNotice } from './UnplacedWordsNotice';

/** A layout that kept some words and dropped the ones given; only the lists are read. */
const layoutDropping = (unplacedWords: readonly string[]): CrosswordLayout => ({
  rows: 0,
  cols: 0,
  cells: [],
  placedWords: [],
  unplacedWords: [...unplacedWords],
});

/**
 * The fork that follows a list some of whose words cross nothing
 * (`create/unplaced`, `design/templates/state-tree.html` lines 880-887). The
 * owner builds the game without them or goes back.
 */
const meta: Meta<typeof UnplacedWordsNotice> = {
  title: 'Components/UnplacedWordsNotice',
  component: UnplacedWordsNotice,
  args: { onConfirm: () => {}, onBack: () => {} },
  decorators: [
    (Story) => (
      <Box sx={gateScreenSx}>
        <Story />
      </Box>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof UnplacedWordsNotice>;

export const ThreeWords: Story = {
  name: 'Three words did not fit (the template)',
  args: { layout: layoutDropping(['rhythm', 'quartz', 'jukebox']) },
};

export const OneWord: Story = {
  name: 'One word did not fit',
  args: { layout: layoutDropping(['rhythm']) },
};
