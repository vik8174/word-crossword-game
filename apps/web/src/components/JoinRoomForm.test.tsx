import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { JoinRoomForm } from './JoinRoomForm';

describe('JoinRoomForm', () => {
  it('asks for a name above the field, in the sentence it always did', () => {
    render(<JoinRoomForm onJoin={() => {}} isJoining={false} />);

    expect(
      screen.getByText(
        'You have been invited to a game. Pick a name the other players will know you by.',
      ),
    ).toBeInTheDocument();
  });

  it('says "Joining the game" while the join is written, with the template\'s words and no full stops', () => {
    render(<JoinRoomForm onJoin={() => {}} isJoining />);

    expect(screen.getByRole('button', { name: 'Joining the game' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /\.\.\./ })).not.toBeInTheDocument();
  });

  it('says why the last attempt failed, above the button and below the field', () => {
    render(<JoinRoomForm onJoin={() => {}} isJoining={false} errorMessage="Try again." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Could not join the game');
    expect(screen.getByRole('alert')).toHaveTextContent('Try again.');
  });
});
