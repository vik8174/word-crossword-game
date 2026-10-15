import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ReactNode, useMemo, useState } from 'react';
import { type CrosswordLayout, validateWordList } from 'shared';

import type { RoomMode } from '../rooms/room-document';
import { Frame } from './Frame';
import { FrameSlotProvider } from './FrameSlotProvider';
import { NewRoomColumn } from './NewRoomColumn';
import { UnplacedWordsNotice } from './UnplacedWordsNotice';
import { WordListForm } from './WordListForm';

/** The 18 words of the template's `MANY` (lines 385-387): the list `create` is reached with. */
const MANY =
  'apple, bread, cheese, dinner, engine, flower, garden, harbour, island, jacket, kitchen, lantern, morning, needle, orchard, pattern, quarter, ribbon';

interface ColumnProps {
  /** The mode the column opens with; the cards change it. */
  readonly mode: RoomMode;
  readonly nickname?: string;
  readonly rawWords?: string;
  readonly noCrossing?: boolean;
  readonly writeFailed?: boolean;
  readonly isCreating?: boolean;
  /** Shows the question about the words that did not fit instead of the form. */
  readonly unplaced?: readonly string[];
}

/**
 * `/create` as `CreateRoomPage` composes it — the column, the choice of what the
 * room is for, and the form or the question under it — with the room service
 * left out, so every state of the screen can be reached by a prop. The cards
 * still change the mode, and the form can still be typed into.
 */
const Column = ({
  mode: initialMode,
  nickname: initialNickname = '',
  rawWords: initialWords = '',
  noCrossing = false,
  writeFailed = false,
  isCreating = false,
  unplaced,
}: ColumnProps) => {
  const [mode, setMode] = useState(initialMode);
  const [nickname, setNickname] = useState(initialNickname);
  const [rawWords, setRawWords] = useState(initialWords);
  const validation = useMemo(() => validateWordList(rawWords), [rawWords]);

  const layout: CrosswordLayout = {
    rows: 0,
    cols: 0,
    cells: [],
    placedWords: [],
    unplacedWords: [...(unplaced ?? [])],
  };

  const under: ReactNode =
    unplaced === undefined ? (
      <WordListForm
        mode={mode}
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
    ) : (
      <UnplacedWordsNotice layout={layout} onConfirm={() => {}} onBack={() => {}} />
    );

  return (
    <NewRoomColumn
      mode={mode}
      onModeChange={setMode}
      isFrozen={isCreating}
      showsChoice={unplaced === undefined}
    >
      {under}
    </NewRoomColumn>
  );
};

/**
 * Every state of `/create` with the choice of what the room is for
 * (`?state=create` and its variants of `design/templates/state-tree.html`,
 * lines 846-889), in both modes: a lesson has the title "New lesson" and the
 * nickname help of a teacher who does not play, and every state gains nothing
 * but the two cards above its form.
 */
const meta: Meta<typeof Column> = {
  title: 'Screens/NewRoomColumn',
  component: Column,
  args: { mode: 'pair' },
  // Under the frame's header, as the app shows it.
  decorators: [
    (Story) => (
      <FrameSlotProvider>
        <Frame />
        <Story />
      </FrameSlotProvider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof Column>;

export const PairResting: Story = {
  name: 'create · a game with a friend chosen',
  args: { nickname: 'Viktor', rawWords: MANY },
};

export const LessonResting: Story = {
  name: 'create · a lesson chosen (lesson)',
  args: { mode: 'lesson', nickname: 'Carmen', rawWords: MANY },
};

export const LessonEmpty: Story = {
  name: 'create · a lesson chosen, nothing typed',
  args: { mode: 'lesson' },
};

export const LessonWordsAtFault: Story = {
  name: 'create/errors · a lesson (the 18 words, then "apple, a")',
  args: { mode: 'lesson', nickname: 'Carmen', rawWords: `${MANY}, apple, a` },
};

export const LessonNothingCrosses: Story = {
  name: 'create/nogrid · a lesson',
  args: { mode: 'lesson', nickname: 'Carmen', rawWords: MANY, noCrossing: true },
};

export const LessonUnplaced: Story = {
  name: 'create/unplaced · a lesson (the choice is not asked again)',
  args: { mode: 'lesson', unplaced: ['rhythm', 'quartz', 'jukebox'] },
};

export const LessonCreating: Story = {
  name: 'create/creating · a lesson (frozen, the dot beats)',
  args: { mode: 'lesson', nickname: 'Carmen', rawWords: MANY, isCreating: true },
};

export const LessonWriteFailed: Story = {
  name: 'create/failed · a lesson',
  args: { mode: 'lesson', nickname: 'Carmen', rawWords: MANY, writeFailed: true },
};
