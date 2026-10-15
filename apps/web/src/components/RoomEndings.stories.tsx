import type { Meta, StoryObj } from '@storybook/react-vite';

import type { RoomDocument } from '../rooms/room-document';
import { type DrawnWord, FEW, gameRoom, GUEST_ID, MANY, OWNER_ID } from './drawn-room';
import { Frame } from './Frame';
import { FrameSlotProvider } from './FrameSlotProvider';
import { RoomClosedEarly } from './RoomClosedEarly';
import { RoomFinished } from './RoomFinished';

/** The drawing's words with every one of them answered: a crossword filled in. */
const allAnswered = (words: readonly DrawnWord[]): readonly DrawnWord[] =>
  words.map((word) => ({ ...word, isAnswered: true }));

/** `finished` on the drawing's board: `completed`, with every word answered. */
const finishedRoom = (words: readonly DrawnWord[], rows: number, cols: number): RoomDocument =>
  gameRoom(allAnswered(words), rows, cols, {}, false, 'completed');

/** `closed-early` on the drawing's board: `closed`, with only the words it answered. */
const closedRoom = (words: readonly DrawnWord[], rows: number, cols: number): RoomDocument =>
  gameRoom(words, rows, cols, {}, false, 'closed');

interface EndingProps {
  /** Which of the two endings to draw. */
  readonly ending: 'finished' | 'closed-early';
  /** The room as it ended; neither ending writes to it, so there is no service to stub. */
  readonly room: RoomDocument;
  /** UID of the player looking at it. */
  readonly viewerId: string;
}

/** Either ending, for the workshop: they take the same two props and write nothing. */
const Ending = ({ ending, room, viewerId }: EndingProps) =>
  ending === 'finished' ? (
    <RoomFinished room={room} viewerId={viewerId} />
  ) : (
    <RoomClosedEarly room={room} viewerId={viewerId} />
  );

/**
 * The two endings under the frame they stand in: the status line is the
 * frame's header, filled by the ending. Both are drawn from the drawing's six
 * words (`size=few`, 9 by 7) and its eight (`size=many`, 11 by 11), as the host
 * and as the guest. A state behind a Firestore write cannot be held live, so the
 * endings are reached from here.
 */
const meta: Meta<typeof Ending> = {
  title: 'Screens/RoomEndings',
  component: Ending,
  args: { ending: 'finished', viewerId: OWNER_ID, room: finishedRoom(FEW, 7, 9) },
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

type Story = StoryObj<typeof Ending>;

/** `finished`, `size=few`, as the host. */
export const Finished: Story = {};

/** `finished`, `size=many`. */
export const FinishedMany: Story = { args: { room: finishedRoom(MANY, 11, 11) } };

/** `finished`, the guest's view. */
export const FinishedAsGuest: Story = { args: { viewerId: GUEST_ID } };

/** `closed-early`, `size=few`, as the host: one word answered, the host's own words written in. */
export const EndedEarly: Story = {
  args: { ending: 'closed-early', room: closedRoom(FEW, 7, 9) },
};

/** `closed-early`, `size=many`. */
export const EndedEarlyMany: Story = {
  args: { ending: 'closed-early', room: closedRoom(MANY, 11, 11) },
};

/** `closed-early`, the guest's view. */
export const EndedEarlyAsGuest: Story = {
  args: { ending: 'closed-early', room: closedRoom(FEW, 7, 9), viewerId: GUEST_ID },
};
