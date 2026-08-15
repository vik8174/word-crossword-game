import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { isValidNickname, MAX_NICKNAME_LENGTH } from '../rooms/nickname';

interface JoinRoomFormProps {
  /** Called with the raw nickname once it is worth submitting. */
  readonly onJoin: (nickname: string) => void;
  /** `true` while the join is being written — the form freezes but stays readable. */
  readonly isJoining: boolean;
  /** Why the last attempt did not go through, if it did not. */
  readonly errorMessage?: string;
}

/**
 * The door into a room: a nickname, and nothing else.
 *
 * There are no accounts in this game — the player is already signed in
 * anonymously by the time this form appears, because reading the room required
 * it, so all that is left to ask is what to call them.
 *
 * @param props.onJoin - Receives the nickname when the player submits a valid one
 * @param props.errorMessage - Message about a join that was refused
 *
 * @example
 * <JoinRoomForm onJoin={join} isJoining={false} />
 */
export const JoinRoomForm = ({ onJoin, isJoining, errorMessage }: JoinRoomFormProps) => {
  const [nickname, setNickname] = useState('');

  return (
    <Box
      component="form"
      onSubmit={(event) => {
        event.preventDefault();
        onJoin(nickname);
      }}
      noValidate
    >
      <Stack spacing={3}>
        <Typography variant="body1">
          You have been invited to a game. Pick a name the other players will know you by.
        </Typography>

        <TextField
          label="Your nickname"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          disabled={isJoining}
          slotProps={{ htmlInput: { maxLength: MAX_NICKNAME_LENGTH } }}
          autoFocus
          fullWidth
        />

        {errorMessage !== undefined && <Alert severity="error">{errorMessage}</Alert>}

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={!isValidNickname(nickname) || isJoining}
        >
          {isJoining ? 'Joining...' : 'Join the game'}
        </Button>
      </Stack>
    </Box>
  );
};
