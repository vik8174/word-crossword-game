import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ReactNode, useEffect, useRef } from 'react';
import { generateCrossword } from 'shared';

import type { RoomDocument } from '../rooms/room-document';
import {
  FEW,
  gameRoom,
  GUEST_ID,
  lessonRoom,
  MANY,
  OLENA_ID,
  OWNER_ID,
  STRANGER_ID,
  TEACHER_ID,
} from './drawn-room';
import { Frame } from './Frame';
import { FrameSlotProvider } from './FrameSlotProvider';
import { RoomGame } from './RoomGame';

/**
 * The short reference list of `docs/manual-checks.md` (ten ordinary words),
 * laid out by the generator and dealt out in turn: the board a real game is
 * most likely to be played on, roughly 14 squares by 11.
 */
const shortListRoom = (): RoomDocument => {
  const layout = generateCrossword(
    'rain garden window bridge candle teapot silver forest pocket lantern'.split(' '),
  );
  const drawn = layout.placedWords.map((placed, index) => ({
    row: placed.cells[0]?.row ?? 0,
    col: placed.cells[0]?.col ?? 0,
    orientation: placed.orientation,
    word: placed.word,
    explainedBy: index % 2 === 0 ? ('viewer' as const) : ('other' as const),
  }));

  return gameRoom(drawn, layout.rows, layout.cols);
};

/**
 * A board with letters beyond the latin range, for `BoardDiacritics`: `łódź`
 * is explained by the viewer (it stands on the board in italics), `ősz` was
 * explained to them and they have answered it (it stands in 700, and hangs on
 * the line as a card). Two words on three rows, side by side, because the
 * story is about the faces they are drawn in and not about crossing.
 */
const diacriticsRoom = (): RoomDocument =>
  gameRoom(
    [
      { row: 0, col: 0, orientation: 'across', word: 'łódź', explainedBy: 'viewer' },
      {
        row: 2,
        col: 0,
        orientation: 'across',
        word: 'ősz',
        explainedBy: 'other',
        isAnswered: true,
      },
    ],
    3,
    4,
  );

/** The write that never settles: the screen stays mid-write. */
const neverSettles = () => new Promise<void>(() => undefined);

/** The write the database refuses outright. */
const refused = () => Promise.reject(new Error('refused'));

/**
 * Does what a player does once the story is on the page: types letters into
 * squares, and presses a button. The workshop's way to reach a state that only
 * typing and pressing reach, as `RoomLobby.stories.tsx` does for the lobby.
 */
const DoOnMount = ({
  type = [],
  press = [],
  children,
}: {
  /** Squares to type into: row, column and the letter, in the order they are typed. */
  readonly type?: readonly (readonly [number, number, string])[];
  /** Buttons to press, one after the other, each once the last has had time to show its result. */
  readonly press?: readonly string[];
  readonly children: ReactNode;
}) => {
  // Read once, when the story arrives: the story's render makes new arrays on
  // every render, and doing it all again for each of them would press "End the
  // game" a second time over the dialog it opened.
  const todo = useRef({ type, press });

  useEffect(() => {
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;

    for (const [row, col, letter] of todo.current.type) {
      const square = document.querySelector<HTMLInputElement>(
        `input[aria-label*="Row ${row + 1}, column ${col + 1} "]`,
      );

      if (square !== null) {
        setValue?.call(square, letter);
        square.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    const timers = todo.current.press.map((name, index) =>
      window.setTimeout(
        () => {
          [...document.querySelectorAll('button')]
            .find((candidate) => candidate.textContent === name)
            ?.click();
        },
        (index + 1) * 250,
      ),
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return children;
};

/** Where `apple` runs, down from row 2 of column 1, spelled with `typed`. */
const appleTyped = (typed: string) =>
  [...typed].map((letter, index) => [2 + index, 1, letter] as const);

/**
 * The game under the frame it stands in: the status line and "End the game"
 * are the frame's header, filled by the game.
 */
const meta: Meta<typeof RoomGame> = {
  title: 'Screens/RoomGame',
  component: RoomGame,
  args: {
    roomId: 'room-1',
    viewerId: OWNER_ID,
    room: gameRoom(FEW, 7, 9),
    writes: { recordGuess: neverSettles, endGameEarly: neverSettles },
  },
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

type Story = StoryObj<typeof RoomGame>;

/** `playing`, `size=few`: the drawing's six words; the board stands in the middle of the zone, no drawing over it. */
export const Playing: Story = {};

/** `playing`, `size=many`: eight words on 11 by 11, the board still the only thing in the zone. */
export const PlayingMany: Story = {
  args: { room: gameRoom(MANY, 11, 11) },
};

/** `playing` on the short reference list at the size of a real game (14 by 11 squares). */
export const ShortReferenceList: Story = {
  args: { room: shortListRoom() },
};

/**
 * `playing` with letters beyond the latin range: `łódź` explained by the viewer
 * and `ősz` answered by them. The page asks for exactly the latin-ext files its
 * letters are drawn in (#232), which is the rule the story is here to show: the
 * (weight, style) pairs the page draws a latin-ext letter in are the files it
 * requests, no more.
 */
export const BoardDiacritics: Story = {
  args: { room: diacriticsRoom() },
};

/** `playing`, the guest's view of the same board. */
export const PlayingAsGuest: Story = {
  args: { viewerId: GUEST_ID },
};

/** `playing/leftout`: a third player the deal did not cover. */
export const LeftOut: Story = {
  args: { viewerId: STRANGER_ID, room: gameRoom(FEW, 7, 9, {}, true) },
};

/** `playing/away`: the room has not heard from this player for two minutes. */
export const Away: Story = {
  args: { room: gameRoom(FEW, 7, 9, { [OWNER_ID]: 150_000 }) },
};

/** `playing/refused`: `apple` typed as "apric", which the board refuses. */
export const Refused: Story = {
  render: (args) => (
    <DoOnMount type={appleTyped('apric')}>
      <RoomGame {...args} />
    </DoOnMount>
  ),
};

/** `playing/guessfail`: `apple` typed right, and the database refuses to record it. */
export const AnswerNotSaved: Story = {
  args: { writes: { recordGuess: refused, endGameEarly: neverSettles } },
  render: (args) => (
    <DoOnMount type={appleTyped('apple')}>
      <RoomGame {...args} />
    </DoOnMount>
  ),
};

/** `playing/confirm`: "End the game" pressed and the question on the page. */
export const ConfirmEnding: Story = {
  render: (args) => (
    <DoOnMount press={['End the game']}>
      <RoomGame {...args} />
    </DoOnMount>
  ),
};

/** `playing/ending`: "End it" pressed and the write under way. */
export const Ending: Story = {
  render: (args) => (
    <DoOnMount press={['End the game', 'End it']}>
      <RoomGame {...args} />
    </DoOnMount>
  ),
};

/** `playing/endfail`: "End it" pressed and the database refuses. */
export const EndingRefused: Story = {
  args: { writes: { recordGuess: neverSettles, endGameEarly: refused } },
  render: (args) => (
    <DoOnMount press={['End the game', 'End it']}>
      <RoomGame {...args} />
    </DoOnMount>
  ),
};

/**
 * A lesson, on the same six words: Carmen teaches, Olena and Taras play
 * (`?mode=lesson`). No game draws the street any more, the teacher's presence or
 * absence included; the lists and the header say who is watching.
 */
const lesson = lessonRoom(FEW, 7, 9);

/** `playing` as a student in a lesson, the teacher at their window: no "End the game". */
export const LessonStudent: Story = {
  args: { viewerId: OLENA_ID, room: lesson },
};

/** `playing/teacheraway` as a student: the room says the game goes on without the teacher. */
export const LessonStudentTeacherAway: Story = {
  args: {
    viewerId: OLENA_ID,
    room: lessonRoom(FEW, 7, 9, { silentFor: { [TEACHER_ID]: 150_000 } }),
  },
};

/** `playing` as the lesson's teacher: every word, marked by who explains it, and "End the lesson". */
export const LessonTeacher: Story = {
  args: { viewerId: TEACHER_ID, room: lesson },
};

/** `playing/away` as the teacher: the room has not heard from them, and they are still at their window. */
export const LessonTeacherAway: Story = {
  args: {
    viewerId: TEACHER_ID,
    room: lessonRoom(FEW, 7, 9, { silentFor: { [TEACHER_ID]: 150_000 } }),
  },
};

/** `playing/confirm` as the teacher: "End the lesson" pressed and the question on the page. */
export const LessonTeacherConfirm: Story = {
  args: { viewerId: TEACHER_ID, room: lesson },
  render: (args) => (
    <DoOnMount press={['End the lesson']}>
      <RoomGame {...args} />
    </DoOnMount>
  ),
};

/** `playing/ending` as the teacher: "End it" pressed and the write under way. */
export const LessonTeacherEnding: Story = {
  args: { viewerId: TEACHER_ID, room: lesson },
  render: (args) => (
    <DoOnMount press={['End the lesson', 'End it']}>
      <RoomGame {...args} />
    </DoOnMount>
  ),
};

/** `playing/endfail` as the teacher: "End it" pressed and the database refuses. */
export const LessonTeacherEndingRefused: Story = {
  args: {
    viewerId: TEACHER_ID,
    room: lesson,
    writes: { recordGuess: neverSettles, endGameEarly: refused },
  },
  render: (args) => (
    <DoOnMount press={['End the lesson', 'End it']}>
      <RoomGame {...args} />
    </DoOnMount>
  ),
};
