import Box from '@mui/material/Box';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';
import { validateWordList } from 'shared';

import { createPanelSx, gateScreenSx } from './gate-panel-styles';
import { WordListForm } from './WordListForm';

/**
 * Wires `WordListForm` up the same way `CreateRoomPage` does — a nickname, a
 * word list, and validation recomputed on every keystroke — so a story can be
 * typed into rather than only looked at, with no change to the form itself.
 */
const InteractiveWordListForm = () => {
  const [nickname, setNickname] = useState('');
  const [rawWords, setRawWords] = useState('');
  const validation = useMemo(() => validateWordList(rawWords), [rawWords]);

  return (
    <WordListForm
      nickname={nickname}
      onNicknameChange={setNickname}
      rawWords={rawWords}
      onWordsChange={setRawWords}
      validation={validation}
      isCreating={false}
      onSubmit={() => {}}
    />
  );
};

/**
 * The room-creation form, on its own — on the panel it stands on inside
 * `CreateRoomPage`.
 */
const meta: Meta<typeof InteractiveWordListForm> = {
  title: 'Components/WordListForm',
  component: InteractiveWordListForm,
  decorators: [
    (Story) => (
      <Box sx={gateScreenSx}>
        <Box sx={createPanelSx}>
          <Story />
        </Box>
      </Box>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof InteractiveWordListForm>;

export const Default: Story = {};
