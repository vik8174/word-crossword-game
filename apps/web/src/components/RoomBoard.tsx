import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMemo } from 'react';

import { playersInJoinOrder } from '../rooms/room-access';
import type { RoomDocument, RoomStatus } from '../rooms/room-document';
import { finishedWordsOf, gridViewFor, wordViewFor } from '../rooms/word-visibility';
import { CrosswordGrid } from './CrosswordGrid';
import { GameCompletedPanel } from './GameCompletedPanel';
import { PlayerList } from './PlayerList';
import { PlayerWordsPanel } from './PlayerWordsPanel';
import { StartGamePanel } from './StartGamePanel';

/**
 * What the room is doing right now, said to a player rather than to a database.
 * A finished game is not in here: it has {@link GameCompletedPanel} to itself,
 * and one line of its own would only say the same thing twice.
 */
const STATUS_MESSAGES: Readonly<Record<Exclude<RoomStatus, 'completed'>, string>> = {
  lobby: 'Waiting for the other players. The game starts once everyone is in.',
  playing: 'The game is on.',
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
  /** Records a word this player has just answered, for every screen at once. */
  readonly onSolveWord: (wordId: string) => Promise<void>;
  /** Why an answer could not be written down, if one could not. */
  readonly solveWordError?: string;
}

/**
 * The room a player has joined: who else is in, their own words, and the grid.
 *
 * Every player reads the same document, so what separates them is drawn here
 * and nowhere else: the words a player explains are theirs alone, the squares
 * they type into are their own, and no letter of anybody's word reaches the
 * grid before the group has earned it (see {@link CrosswordGrid}).
 *
 * @param props.room - The room document
 * @param props.viewerId - Which player is reading, so they see their own words
 * @param props.onStartGame - Called when the owner starts the game
 * @param props.onSolveWord - Called when this player has answered one of their words
 *
 * @example
 * <RoomBoard room={room} viewerId={playerId} onStartGame={start} onSolveWord={solve} isStartingGame={false} />
 */
export const RoomBoard = ({
  room,
  viewerId,
  onStartGame,
  isStartingGame,
  startGameError,
  onSolveWord,
  solveWordError,
}: RoomBoardProps) => {
  const players = playersInJoinOrder(room);
  const wordView = wordViewFor(room, viewerId);
  // Kept across renders the room did not change in, so the grid's own state —
  // the letters this player has typed so far — is not judged afresh every time
  // React redraws for some other reason.
  const gridView = useMemo(() => gridViewFor(room, viewerId), [room, viewerId]);
  const status = room.status;
  const isWaitingToStart = status === 'lobby';
  const isFinished = status === 'completed';

  return (
    <Stack spacing={3}>
      {isFinished ? (
        <GameCompletedPanel words={finishedWordsOf(room)} playerCount={players.length} />
      ) : (
        <Typography variant="body1" role="status">
          {STATUS_MESSAGES[status]}
        </Typography>
      )}

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

      {/* Both of these are about a game still being played — what each player
          has left to do. A finished room says it all once, up top. */}
      {!isFinished && wordView.kind === 'dealt' && <PlayerWordsPanel view={wordView} />}

      {!isFinished && wordView.kind === 'left-out' && (
        <Alert severity="info">{LEFT_OUT_MESSAGE}</Alert>
      )}

      <section aria-labelledby="grid-heading">
        <Typography id="grid-heading" variant="h6" component="h2">
          The crossword
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isFinished
            ? `All ${room.layout.placedWords.length} words of this grid are in place.`
            : `${room.layout.placedWords.length} words are hidden in this grid. Type your own into the squares that take letters; a word's letters appear for everybody once it has been answered.`}
        </Typography>

        <CrosswordGrid view={gridView} onSolved={onSolveWord} />

        {solveWordError !== undefined && <Alert severity="error">{solveWordError}</Alert>}
      </section>
    </Stack>
  );
};
