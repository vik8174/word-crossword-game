import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { isValidNickname, MAX_NICKNAME_LENGTH } from '../rooms/nickname';
import type { RoomMode } from '../rooms/room-document';
import { readRememberedNickname } from '../rooms/nickname-store';
import { Field } from './Field';
import { gateButtonRowSx, gateLedeSx, gateStackSx } from './gate-panel-styles';
import { Message } from './Message';
import { PillButton } from './PillButton';
import { stepTitleSx } from './surface-styles';

interface JoinRoomFormProps {
  /** The name the owner of the room goes by, for the sentence that says who invited the visitor. */
  readonly ownerNickname: string;
  /** What the room is for; `pair` unless given. A lesson invites to a lesson and not to a game. */
  readonly mode?: RoomMode;
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
 * Somebody who has played here before is asked with their last name already in
 * the field: offered, not imposed, since the field is theirs to rewrite and
 * what they leave in it is what gets remembered next (issue #75).
 *
 * The title, the sentence and the blocks under them are one `.stack` of the
 * template's `joinScreen` (`design/templates/state-tree.html`, lines 898-910),
 * 18px apart. The sentence names the owner by the nickname they chose and uses
 * no pronoun for them, because the app does not know anybody's pronouns (the
 * one difference from the template, which says "he"). While the join is written
 * the button says so in the template's words (issues #198 and #226).
 *
 * In a lesson the title is "Join the lesson", and the sentence names the teacher
 * and says the visitor is invited to a lesson (template line 899, `lesson()`).
 * The button says "Join the lesson" and, while the join is written, "Joining the
 * game": the template words the second state the same for both modes.
 *
 * @param props.ownerNickname - Who invited the visitor
 * @param props.mode - What the room is for
 * @param props.onJoin - Receives the nickname when the player submits a valid one
 * @param props.errorMessage - Message about a join that was refused
 *
 * @example
 * <JoinRoomForm onJoin={join} isJoining={false} />
 */
export const JoinRoomForm = ({
  ownerNickname,
  mode = 'pair',
  onJoin,
  isJoining,
  errorMessage,
}: JoinRoomFormProps) => {
  // Read once, and only once: this form lives inside a room that is rebuilt on
  // every snapshot, and a live room produces one every fifteen seconds from
  // each client marking itself present. The lazy form of `useState` is what
  // keeps that from being a read of the storage per render whose answer is
  // thrown away.
  const [nickname, setNickname] = useState(readRememberedNickname);
  const isLesson = mode === 'lesson';
  const joinLabel = isLesson ? 'Join the lesson' : 'Join the game';

  return (
    <Box
      component="form"
      onSubmit={(event) => {
        event.preventDefault();
        onJoin(nickname);
      }}
      noValidate
      sx={gateStackSx}
    >
      <Typography component="h1" variant="stepTitle" sx={{ ...stepTitleSx(), margin: 0 }}>
        {joinLabel}
      </Typography>

      <Box component="p" sx={gateLedeSx}>
        {isLesson
          ? `${ownerNickname} has invited you to a lesson. Pick a name the others will know you by.`
          : `${ownerNickname} has invited you to a game. Pick a name they will know you by.`}
      </Box>

      <Field
        id="nickname"
        label="Your nickname"
        value={nickname}
        onChange={setNickname}
        disabled={isJoining}
        maxLength={MAX_NICKNAME_LENGTH}
        autoFocus
      />

      {errorMessage !== undefined && (
        <Message kind="error" heading="Could not join the game">
          {errorMessage}
        </Message>
      )}

      <Box sx={gateButtonRowSx}>
        <PillButton type="submit" loading={isJoining} disabled={!isValidNickname(nickname)}>
          {isJoining ? 'Joining the game' : joinLabel}
        </PillButton>
      </Box>
    </Box>
  );
};
