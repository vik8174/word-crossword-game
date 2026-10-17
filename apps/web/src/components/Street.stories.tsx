import Box from '@mui/material/Box';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Street } from './Street';

/**
 * Every set the screens ask of the street drawing, in the order of the
 * template's state tree (`design/templates/state-tree.html`), each with the
 * props and the label the template gives that state.
 *
 * The drawing has no state of its own: every story is a set of props. The
 * motion the template attaches to it (`motion-styles.ts`) is not a story of its own:
 * it is played by the screen that opens, and the stories stand still.
 */
const meta: Meta<typeof Street> = {
  title: 'Components/Street',
  component: Street,
  decorators: [
    (Story) => (
      <Box sx={{ width: 640, maxWidth: '100%', mx: 'auto', pt: 2 }}>
        <Story />
      </Box>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof Street>;

/** The words of a game with six answered, in board order (template `BOARDS.few`). */
const FEW_WORDS = ['bread', 'engine', 'cheese', 'apple', 'dinner', 'flower'];
/** The words of a game with eight answered, in board order (template `BOARDS.many`). */
const MANY_WORDS = [...FEW_WORDS, 'ribbon', 'needle'];

/** `home`: the name of the game, spelt out on tiles. */
export const Home: Story = {
  args: {
    letters: 'radio',
    mood: 'talk',
    label:
      'Two neighbours on facing balconies in a white Andalusian street, with a line strung between them',
  },
};

/** `connecting`: a neighbour waving to an empty balcony, no line. */
export const Connecting: Story = {
  args: {
    right: 'empty',
    line: 'none',
    mood: 'wave',
    crop: 'top',
    label: 'A neighbour waving across the street to an empty balcony',
  },
};

/** `join`: a neighbour waves from her balcony, no line. */
export const Join: Story = {
  args: {
    right: 'empty',
    line: 'none',
    mood: 'wave',
    crop: 'top',
    label: 'A neighbour waving from her balcony to an empty balcony across the street',
  },
};

/** `lobby/waiting`: both wait, the second balcony still empty. */
export const LobbyWaiting: Story = {
  args: {
    right: 'empty',
    line: 'none',
    mood: 'wait',
    crop: 'top',
    label: 'Your balcony, and the one across the street still empty',
  },
};

/** `unavailable/full`: the balcony across the street is shut. */
export const UnavailableFull: Story = {
  args: {
    right: 'shut',
    line: 'none',
    mood: 'calm',
    crop: 'top',
    label: 'A balcony across the street with its shutters closed',
  },
};

/** `reload`: both balconies shuttered, no line. The left one is `left: 'shut'`, which only this state and `crash` ask for. */
export const Reload: Story = {
  args: {
    left: 'shut',
    right: 'shut',
    line: 'none',
    mood: 'calm',
    crop: 'top',
    label: 'A quiet street, the shutters closed on both balconies',
  },
};

/** `crash`: both balconies shuttered, the line still strung and slack under four tiles that spell oops. */
export const Crash: Story = {
  args: {
    left: 'shut',
    right: 'shut',
    line: 'slack',
    letters: 'oops',
    mood: 'calm',
    crop: 'top',
    label:
      'Both balconies shuttered, the line between them sagging under four tiles that spell oops',
  },
};

/** `lobby`: both balconies taken, a pair game. */
export const Lobby: Story = {
  args: {
    right: 'here',
    line: 'taut',
    mood: 'wave',
    crop: 'top',
    label: 'Both balconies taken, the line strung between them',
  },
};

/** `lobby` with `mode=lesson`: the teacher watches from the house at the end of the street. */
export const LobbyLesson: Story = {
  args: {
    ...Lobby.args,
    teacher: 'here',
    label:
      'Both balconies taken, the line strung between them, and the teacher watching from the house at the end of the street',
  },
};

/**
 * `lobby/nostudent`: the teacher's first lobby. Both balconies are dark, nobody
 * stands in either, no line is strung, and the teacher is at the end of the
 * street. The left balcony is `left: 'empty'`, which only this state asks for.
 */
export const LobbyNoStudent: Story = {
  args: {
    left: 'empty',
    right: 'empty',
    line: 'none',
    mood: 'wait',
    crop: 'top',
    teacher: 'here',
    label:
      'Both balconies still empty, and the teacher watching from the house at the end of the street',
  },
};

/** `lobby/teacheraway`: the teacher's curtains are drawn. */
export const LobbyTeacherAway: Story = {
  args: {
    ...Lobby.args,
    teacher: 'away',
    label: 'Both balconies taken, the line strung between them, the teacher away from her window',
  },
};

/** `lobby` with the second player away: the curtains are drawn. */
export const RightAway: Story = {
  args: {
    right: 'away',
    line: 'taut',
    mood: 'calm',
    crop: 'top',
    label: 'The balcony across the street with its curtains drawn',
  },
};

/** `playing`: one answered word on the line. */
export const Playing: Story = {
  args: {
    crop: 'band',
    cards: ['bread'],
    mood: 'talk',
    label: 'The answered words hanging on the line between the two balconies',
  },
};

/** `finished`: six words, lanterns and confetti. */
export const Finished: Story = {
  args: {
    crop: 'band',
    cards: FEW_WORDS,
    mood: 'cheer',
    fiesta: true,
    label:
      'A fiesta in the street: paper lanterns and confetti, both neighbours cheering, every word hanging on the line',
  },
};

/** `finished` on a bigger board: eight words on the line. */
export const FinishedManyWords: Story = {
  args: { ...Finished.args, cards: MANY_WORDS },
};

/** `closed-early`: the game ended with the line sagging. */
export const ClosedEarly: Story = {
  args: {
    line: 'slack',
    crop: 'band',
    cards: ['bread'],
    mood: 'calm',
    label: 'A sagging line between the balconies, holding only the answered words',
  },
};
