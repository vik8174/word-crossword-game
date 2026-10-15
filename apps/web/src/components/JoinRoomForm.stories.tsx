import type { Meta, StoryObj } from '@storybook/react-vite';

import { rememberNickname } from '../rooms/nickname-store';
import { DoorColumn, JoinStreet } from './DoorColumn';
import { Frame } from './Frame';
import { FrameSlotProvider } from './FrameSlotProvider';
import { JoinRoomForm } from './JoinRoomForm';

/**
 * The door into a room, on the column it stands in at the doors with the street
 * above it (`?state=join`, `join/joining` and `join/failed` of the template;
 * issue #226).
 *
 * One story per state a prop drives: resting, the join being written, and the
 * last attempt having failed. That the field is focused on arrival, and that
 * its ring shows, is reached by opening the story rather than by a prop.
 */
const meta: Meta<typeof JoinRoomForm> = {
  title: 'Components/JoinRoomForm',
  component: JoinRoomForm,
  args: { ownerNickname: 'Viktor', onJoin: () => undefined, isJoining: false },
  decorators: [
    // The street over a lesson's door shows the teacher at the end of it, which
    // the form does not know: a story says so with `parameters.teacher`. A story
    // that gives `parameters.nickname` opens as a player who has played here
    // before, whose name the field is offered back with (issue #75).
    (Story, { parameters }) => {
      if (typeof parameters.nickname === 'string') {
        rememberNickname(parameters.nickname);
      }

      return (
        <FrameSlotProvider>
          {parameters.framed === true && <Frame />}
          <DoorColumn
            picture={<JoinStreet teacher={parameters.teacher as 'here' | 'away' | undefined} />}
          >
            <Story />
          </DoorColumn>
        </FrameSlotProvider>
      );
    },
  ],
};

export default meta;

type Story = StoryObj<typeof JoinRoomForm>;

export const Resting: Story = {};

export const Joining: Story = {
  args: { isJoining: true },
};

export const Failed: Story = {
  args: { errorMessage: 'Check your connection and try again. The room is still there.' },
};

/** `join` of a lesson, seen by a student: the teacher at the end of the street. */
export const LessonResting: Story = {
  name: 'Lesson · join (the teacher is here)',
  args: { ownerNickname: 'Carmen', mode: 'lesson' },
  parameters: { teacher: 'here', framed: true, nickname: 'Olena' },
};

/** `join` of a lesson whose teacher's mark is old as the student reads it: the curtains are drawn. */
export const LessonTeacherAway: Story = {
  name: 'Lesson · join (the teacher is away)',
  args: { ownerNickname: 'Carmen', mode: 'lesson' },
  parameters: { teacher: 'away', framed: true, nickname: 'Olena' },
};

/** `join/joining` of a lesson. */
export const LessonJoining: Story = {
  name: 'Lesson · join/joining',
  args: { ownerNickname: 'Carmen', mode: 'lesson', isJoining: true },
  parameters: { teacher: 'here', framed: true, nickname: 'Olena' },
};

/** `join/failed` of a lesson. */
export const LessonFailed: Story = {
  name: 'Lesson · join/failed',
  args: {
    ownerNickname: 'Carmen',
    mode: 'lesson',
    errorMessage: 'Check your connection and try again. The room is still there.',
  },
  parameters: { teacher: 'here', framed: true, nickname: 'Olena' },
};
