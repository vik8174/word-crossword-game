import Box from '@mui/material/Box';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { Field, ReadOnlyField } from './Field';
import { gateScreenSx } from './gate-panel-styles';

/** The column every screen stands a field in (`.column`), on the ground. */
const Column = ({ children }: { readonly children: React.ReactNode }) => (
  <Box sx={gateScreenSx}>{children}</Box>
);

/**
 * A field needs somewhere to keep the text it holds, so each story owns a small
 * piece of state to type into rather than freezing every keystroke.
 */
const Controlled = ({
  initial = '',
  ...props
}: Omit<Parameters<typeof Field>[0], 'value' | 'onChange'> & { readonly initial?: string }) => {
  const [value, setValue] = useState(initial);

  return <Field {...props} value={value} onChange={setValue} />;
};

/**
 * Every kind and prop-driven state `Field` carries in this app (design v2,
 * `design/templates/state-tree.html` lines 151-164 and 293-295): single-line
 * and multi-line, each at rest, with a placeholder showing and locked;
 * multi-line also at fault, with the strip under its words; and the read-only
 * kind that shows the invite link.
 *
 * `focused` is not a story of its own: it is a CSS pseudo-class reachable by
 * clicking or tabbing into any story below.
 */
const meta: Meta<typeof Field> = {
  title: 'Components/Field',
  component: Field,
  decorators: [
    (Story) => (
      <Column>
        <Story />
      </Column>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof Field>;

export const SingleLineAtRest: Story = {
  name: 'Single-line · at rest, with its help line (create, nickname)',
  render: () => (
    <Controlled
      id="nickname"
      label="Your nickname"
      initial="Viktor"
      help="The other player sees you by this name. You play in your own room too."
    />
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
    <Controlled
      id="words"
      label="Words"
      multiline
      initial="apple, bread, cheese, dinner, engine, flower, garden, harbour, island, jacket, kitchen, lantern, morning, needle, orchard, pattern, quarter, ribbon"
      help="10 to 20 words, 3 to 16 letters each, no repeats. 18 words entered."
    />
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

export const MultilineAtFault: Story = {
  name: 'Multi-line · at fault, the strip under the words (create/errors)',
  render: () => (
    <Field
      id="words-fault"
      label="Words"
      value="apple, bread, cheese, dinner, engine, flower, garden, harbour, island, jacket, kitchen, lantern, morning, needle, orchard, pattern, quarter, ribbon, apple, a"
      onChange={() => {}}
      multiline
      faults={[
        '“apple” is in the list twice. Keep one of them.',
        '“a” is too short. A word needs 3 letters or more.',
      ]}
      help="10 to 20 words, 3 to 16 letters each, no repeats. 20 words entered."
    />
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

export const ReadOnly: Story = {
  name: 'Read-only · the invite link, one line that clips (lobby)',
  render: () => (
    <ReadOnlyField label="Invite link" value="https://acrossthestreet.app/room/k3J9xQ2mPa" />
  ),
};
