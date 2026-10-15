import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';
import { validateWordList } from 'shared';

import { gateScreenSx } from './gate-panel-styles';
import { WordListForm } from './WordListForm';
import Box from '@mui/material/Box';

/** The 18 words of the template's `MANY` (line 385-387): the list `create` is reached with. */
const MANY =
  'apple, bread, cheese, dinner, engine, flower, garden, harbour, island, jacket, kitchen, lantern, morning, needle, orchard, pattern, quarter, ribbon';

interface FormProps {
  readonly nickname?: string;
  readonly rawWords?: string;
  readonly noCrossing?: boolean;
  readonly writeFailed?: boolean;
  readonly isCreating?: boolean;
}

/**
 * Wires `WordListForm` up the same way `CreateRoomPage` does — a nickname, a
 * word list, and validation recomputed on every keystroke — so a story can be
 * typed into rather than only looked at. The props are where it starts.
 */
const InteractiveWordListForm = ({
  nickname: initialNickname = '',
  rawWords: initialWords = '',
  noCrossing = false,
  writeFailed = false,
  isCreating = false,
}: FormProps) => {
  const [nickname, setNickname] = useState(initialNickname);
  const [rawWords, setRawWords] = useState(initialWords);
  const validation = useMemo(() => validateWordList(rawWords), [rawWords]);

  return (
    <WordListForm
      nickname={nickname}
      onNicknameChange={setNickname}
      rawWords={rawWords}
      onWordsChange={setRawWords}
      validation={validation}
      noCrossing={noCrossing}
      writeFailed={writeFailed}
      isCreating={isCreating}
      onSubmit={() => {}}
    />
  );
};

/**
 * The room-creation form, on its own, in the column `CreateRoomPage` stands it
 * in. One story per state `?state=create` and its variants draw in the
 * template (`design/templates/state-tree.html`, lines 855-889): resting,
 * at fault, nothing crossing, writing and refused. `create/unplaced` is
 * `UnplacedWordsNotice`'s.
 */
const meta: Meta<typeof InteractiveWordListForm> = {
  title: 'Components/WordListForm',
  component: InteractiveWordListForm,
  decorators: [
    (Story) => (
      <Box sx={gateScreenSx}>
        <Story />
      </Box>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof InteractiveWordListForm>;

export const Empty: Story = {
  name: 'Empty · nothing typed, the button says what it waits for',
};

export const Ready: Story = {
  name: 'Ready · create (the 18 words, a nickname)',
  args: { nickname: 'Viktor', rawWords: MANY },
};

export const TooFewWords: Story = {
  name: 'Too few words · the count is said beside the button, not in the field',
  args: { nickname: 'Viktor', rawWords: 'apple, bread, cheese, dinner, engine, flower' },
};

export const WordsAtFault: Story = {
  name: 'Words at fault · create/errors (the 18 words, then "apple, a")',
  args: { nickname: 'Viktor', rawWords: `${MANY}, apple, a` },
};

export const NothingCrosses: Story = {
  name: 'Nothing crosses · create/nogrid',
  args: { nickname: 'Viktor', rawWords: MANY, noCrossing: true },
};

export const Creating: Story = {
  name: 'Creating · create/creating (frozen, the dot beats)',
  args: { nickname: 'Viktor', rawWords: MANY, isCreating: true },
};

export const WriteFailed: Story = {
  name: 'Write failed · create/failed (a card: no field owns it)',
  args: { nickname: 'Viktor', rawWords: MANY, writeFailed: true },
};
