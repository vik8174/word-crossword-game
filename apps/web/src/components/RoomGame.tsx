import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { openGridCaption } from '../rooms/grid-caption';
import { playersInJoinOrder } from '../rooms/room-access';
import type { RoomDocument } from '../rooms/room-document';
import { recordGuess } from '../rooms/room-service';
import { useGameCompletion } from '../rooms/use-game-completion';
import { wordViewFor } from '../rooms/word-visibility';
import { PlayerList } from './PlayerList';
import { PlayerWordsPanel } from './PlayerWordsPanel';
import { RoomCrossword } from './RoomCrossword';

/** Said in a room whose words have been dealt out and is being played. */
const PLAYING_MESSAGE = 'The game is on.';

/**
 * Said to a player who is in the room but in nobody's assignment — they joined
 * in the instant between the owner reading the room and dealing the words out.
 * Every word would read as theirs to explain, so they are shown none of them.
 */
const LEFT_OUT_MESSAGE =
  'This game was dealt out just as you arrived, so it is running without you — none of its words are yours to explain or guess, and none of them are shown here. Ask the others for a link to the next game.';

// Firestore keeps retrying a write it merely could not send, so a rejection
// here means the database refused it outright — most likely an expired room.
const GUESS_FAILED_MESSAGE =
  'Your answer was right, but the others could not be told about it. The room may have expired — reload the page to see where the game stands.';

interface RoomGameProps {
  /** Id of the room, for the answers and the ending this screen writes. */
  readonly roomId: string;
  /** The room as it stands, following live updates from Firestore. */
  readonly room: RoomDocument;
  /** UID of the player looking at it, so they see their own half of the game. */
  readonly viewerId: string;
}

/**
 * A game in progress: this player's own words, and the grid they type into.
 *
 * Every player reads the same document, so what separates them is drawn here
 * and nowhere else: the words a player explains are theirs alone, the squares
 * they type into are their own, and no letter of anybody's word reaches the
 * grid before the group has earned it (see {@link RoomCrossword}).
 *
 * Both writes a game makes belong to this screen. Answers are one of them; the
 * other is the ending, which is watched for here rather than one screen up, so
 * that only somebody actually playing closes a game
 * (`docs/decisions/0012-ending-a-game-from-the-received-state.md` says who may
 * write it, not who has to be watching).
 *
 * @param props.roomId - Id of the room being played
 * @param props.room - The room document
 * @param props.viewerId - Which player is reading, so they see their own words
 *
 * @example
 * <RoomGame roomId={roomId} room={room} viewerId={playerId} />
 */
export const RoomGame = ({ roomId, room, viewerId }: RoomGameProps) => {
  // Only ever a failure: a right answer needs no confirmation on this screen —
  // it turns into letters in the grid, for everybody at once.
  const [guessError, setGuessError] = useState<string | null>(null);
  const players = playersInJoinOrder(room);
  const wordView = wordViewFor(room, viewerId);

  // Watches the room that arrives rather than the answer this player sent: the
  // client that answered last is not necessarily the one that can tell the game
  // is over (`docs/decisions/0012-ending-a-game-from-the-received-state.md`).
  useGameCompletion(roomId, room);

  const submitGuess = async (wordId: string) => {
    try {
      await recordGuess({ roomId, playerId: viewerId, wordId });
      setGuessError(null);
    } catch (error) {
      console.error('Recording the answer failed', error);
      setGuessError(GUESS_FAILED_MESSAGE);
      // Rethrown so the grid stops counting this word as written down and can
      // send it again; swallowing it here is what would lose the answer.
      throw error;
    }
  };

  return (
    <Stack spacing={3}>
      <Typography variant="body1" role="status">
        {PLAYING_MESSAGE}
      </Typography>

      <PlayerList players={players} ownerId={room.ownerId} viewerId={viewerId} />

      {wordView.kind === 'dealt' && <PlayerWordsPanel view={wordView} />}

      {wordView.kind === 'left-out' && <Alert severity="info">{LEFT_OUT_MESSAGE}</Alert>}

      <RoomCrossword
        room={room}
        viewerId={viewerId}
        caption={openGridCaption(room.layout.placedWords.length)}
        onSolved={submitGuess}
        errorMessage={guessError ?? undefined}
      />
    </Stack>
  );
};
