import Box from '@mui/material/Box';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { fullHeightBandSx, GATE_BAND_WIDTH, ON_SCENE_SX } from '../garden/scene-surface';
import { gapAt } from '../scale';
import { Field, FieldHelp, FieldSet } from './Field';

/** How far the gate's own column keeps from the edge of the band (`pages/CreateRoomPage.tsx`). */
const GATE_PADDING = gapAt(4);
const GATE_COLUMN_WIDTH = `calc(${GATE_BAND_WIDTH} - ${GATE_PADDING} - ${GATE_PADDING})`;

/**
 * The gate's own band, standing exactly as `CreateRoomPage` stands its form
 * on it — `Message.stories.tsx`'s own `GateSurface`, reused here rather than
 * exported from it: every field this issue builds stands on this one
 * surface, the same one `WordListForm` and `JoinRoomForm` render onto.
 */
const GateSurface = ({ children }: { readonly children: React.ReactNode }) => (
  <Box sx={{ position: 'relative', minHeight: '100dvh', ...ON_SCENE_SX }}>
    <Box aria-hidden sx={fullHeightBandSx('centre', GATE_BAND_WIDTH)} />
    <Box
      sx={{ position: 'relative', width: '100%', maxWidth: GATE_COLUMN_WIDTH, mx: 'auto', pt: 5 }}
    >
      {children}
    </Box>
  </Box>
);

/**
 * A field needs somewhere to keep the text it holds — MUI's own stories are
 * rendered stateless, but this control has no default value of its own the
 * way an uncontrolled input would, so each story owns a small piece of state
 * to type into rather than freezing every keystroke.
 */
const Controlled = (props: Omit<Parameters<typeof Field>[0], 'value' | 'onChange'>) => {
  const [value, setValue] = useState('');

  return <Field {...props} value={value} onChange={setValue} />;
};

/**
 * Every kind and prop-driven state `Field` carries in this app — one story
 * per row of issue #193's "Storybook" section: single-line and multi-line,
 * each at rest, locked, and with a placeholder showing; multi-line also
 * invalid, the one state the words field alone can reach.
 *
 * `focused` is not a story of its own, the same way `PillButton.stories.tsx`
 * explains: no pseudo-state addon is installed here on purpose
 * (`.storybook/main.ts`), and it is a CSS pseudo-class (`:focus-within`)
 * reachable by clicking or tabbing into any story below.
 */
const meta: Meta<typeof Field> = {
  title: 'Components/Field',
  component: Field,
  parameters: { scene: 'gate' },
  decorators: [
    (Story) => (
      <GateSurface>
        <Story />
      </GateSurface>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof Field>;

export const SingleLineAtRest: Story = {
  name: 'Single-line · at rest (create/join, nickname)',
  render: () => (
    <FieldSet>
      <Controlled id="nickname" label="Your nickname" describedBy="nickname-help" />
      <FieldHelp id="nickname-help">
        Other players see you by this name. You play in your own room too.
      </FieldHelp>
    </FieldSet>
  ),
};

export const SingleLineWithPlaceholder: Story = {
  name: 'Single-line · with a placeholder showing',
  render: () => <Controlled id="nickname-empty" label="Your nickname" placeholder="e.g. Viktor" />,
};

export const SingleLineLocked: Story = {
  name: 'Single-line · locked (join/joining)',
  render: () => (
    <Field id="nickname-locked" label="Your nickname" value="Olena" onChange={() => {}} disabled />
  ),
};

export const MultilineAtRest: Story = {
  name: 'Multi-line · at rest (create, words)',
  render: () => (
    <FieldSet>
      <Controlled id="words" label="Words" multiline />
      <FieldHelp>
        4-20 English words, 3-16 letters each, no repeats. Separate them with commas, spaces or new
        lines.
      </FieldHelp>
    </FieldSet>
  ),
};

export const MultilineWithPlaceholder: Story = {
  name: 'Multi-line · with a placeholder showing',
  render: () => (
    <Controlled
      id="words-empty"
      label="Words"
      multiline
      placeholder={'apple, bread, cheese\ndinner, engine, flower'}
    />
  ),
};

export const MultilineInvalid: Story = {
  name: 'Multi-line · invalid (create/errors, words)',
  render: () => (
    <FieldSet>
      <Field
        id="words-invalid"
        label="Words"
        value="apple, apple, a"
        onChange={() => {}}
        multiline
        invalid
      />
      <FieldHelp>Two of these are repeats, and "a" is shorter than three letters.</FieldHelp>
    </FieldSet>
  ),
};

export const MultilineLocked: Story = {
  name: 'Multi-line · locked (create/creating, words)',
  render: () => (
    <Field
      id="words-locked"
      label="Words"
      value={'apple, bread, cheese, dinner,\nengine, flower, garden, harbor'}
      onChange={() => {}}
      multiline
      disabled
    />
  ),
};
