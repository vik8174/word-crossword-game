import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { JoinRoomForm } from './JoinRoomForm';

describe('JoinRoomForm', () => {
  it("names the step, then says who invited the visitor, with the owner's own nickname", () => {
    render(<JoinRoomForm ownerNickname="Viktor" onJoin={() => {}} isJoining={false} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Join the game' })).toBeInTheDocument();
    expect(
      screen.getByText('Viktor has invited you to a game. Pick a name they will know you by.'),
    ).toBeInTheDocument();
  });

  it("uses no pronoun for the owner: the app does not know anybody's", () => {
    render(<JoinRoomForm ownerNickname="Olena" onJoin={() => {}} isJoining={false} />);

    expect(screen.getByText(/has invited you/)).not.toHaveTextContent(/\b(he|she|his|her)\b/i);
  });

  it('says "The room is still there." as the template does, with no dash, when the wire fails', () => {
    render(
      <JoinRoomForm
        ownerNickname="Viktor"
        onJoin={() => {}}
        isJoining={false}
        errorMessage="Check your connection and try again. The room is still there."
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Check your connection and try again. The room is still there.',
    );
  });

  it('says "Joining the game" while the join is written, with the template\'s words and no full stops', () => {
    render(<JoinRoomForm ownerNickname="Viktor" onJoin={() => {}} isJoining />);

    expect(screen.getByRole('button', { name: 'Joining the game' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /\.\.\./ })).not.toBeInTheDocument();
  });

  it('says why the last attempt failed, above the button and below the field', () => {
    render(
      <JoinRoomForm
        ownerNickname="Viktor"
        onJoin={() => {}}
        isJoining={false}
        errorMessage="Try again."
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Could not join the game');
    expect(screen.getByRole('alert')).toHaveTextContent('Try again.');
  });
});
