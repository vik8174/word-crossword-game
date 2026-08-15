import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { playersInJoinOrder } from '../rooms/room-access';
import type { RoomDocument, RoomStatus } from '../rooms/room-document';
import { wordViewFor } from '../rooms/word-visibility';
import { CrosswordGridOutline } from './CrosswordGridOutline';
import { PlayerList } from './PlayerList';
import { PlayerWordsPanel } from './PlayerWordsPanel';
import { StartGamePanel } from './StartGamePanel';

/** What the room is doing right now, said to a player rather than to a database. */
const STATUS_MESSAGES: Readonly<Record<RoomStatus, string>> = {
  lobby: 'Waiting for the other players. The game starts once everyone is in.',
  playing: 'The game is on.',
  completed: 'This game is finished — every word has been guessed.',
};

/**
 * Said to a player who is in the room but in nobody's assignment — they joined
 * in the instant between the owner reading the room and dealing the words out.
 * Every word would read as theirs to explain, so they are shown none of them.
 */
const LEFT_OUT_MESSAGE =
  'This game was dealt out just as you arrived, so it is running without you — none of its words are yours to explain or guess, and none of them are shown here. Ask the others for a link to the next game.';

interface RoomBoardProps {
  /** The room as it stands, following live updates from Firestore. */
  readonly room: RoomDocument;
  /** UID of the player looking at it. */
  readonly viewerId: string;
  /** Deals the words out and opens the game; offered to the owner only. */
  readonly onStartGame: () => void;
  /** `true` while the deal is being written. */
  readonly isStartingGame: boolean;
  /** Why the last attempt to start did not go through, if it did not. */
  readonly startGameError?: string;
}

/**
 * The room a player has joined: who else is in, their own words, and the grid.
 *
 * Every player reads the same document, so what separates them is drawn here
 * and nowhere else: the words a player explains are theirs alone, and the grid
 * gives away no letter of anyone's (see {@link CrosswordGridOutline}). Typing
 * guesses into it arrives with issue #7.
 *
 * @param props.room - The room document
 * @param props.viewerId - Which player is reading, so they see their own words
 * @param props.onStartGame - Called when the owner starts the game
 *
 * @example
 * <RoomBoard room={room} viewerId={playerId} onStartGame={start} isStartingGame={false} />
 */
export const RoomBoard = ({
  room,
  viewerId,
  onStartGame,
  isStartingGame,
  startGameError,
}: RoomBoardProps) => {
  const players = playersInJoinOrder(room);
  const wordView = wordViewFor(room, viewerId);
  const isWaitingToStart = room.status === 'lobby';

  return (
    <Stack spacing={3}>
      <Typography variant="body1" role="status">
        {STATUS_MESSAGES[room.status]}
      </Typography>

      <PlayerList players={players} ownerId={room.ownerId} viewerId={viewerId} />

      {isWaitingToStart && viewerId === room.ownerId && (
        <StartGamePanel
          playerCount={players.length}
          wordCount={room.layout.placedWords.length}
          onStart={onStartGame}
          isStarting={isStartingGame}
          errorMessage={startGameError}
        />
      )}

      {wordView.kind === 'dealt' && <PlayerWordsPanel view={wordView} />}

      {wordView.kind === 'left-out' && <Alert severity="info">{LEFT_OUT_MESSAGE}</Alert>}

      <section aria-labelledby="grid-heading">
        <Typography id="grid-heading" variant="h6" component="h2">
          The crossword
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {`${room.layout.placedWords.length} words are hidden in this grid. A word's letters appear once it has been guessed — nobody's grid gives their own words away.`}
        </Typography>

        <CrosswordGridOutline layout={room.layout} />
      </section>
    </Stack>
  );
};
