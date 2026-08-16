import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMemo } from 'react';

import { lobbyStatusMessage } from '../rooms/lobby-status';
import { playersInJoinOrder } from '../rooms/room-access';
import { isGameFinished } from '../rooms/room-completion';
import type { RoomDocument } from '../rooms/room-document';
import { finishedWordsOf, gridViewFor, wordViewFor } from '../rooms/word-visibility';
import { CrosswordGrid } from './CrosswordGrid';
import { GameCompletedPanel } from './GameCompletedPanel';
import { PlayerList } from './PlayerList';
import { PlayerWordsPanel } from './PlayerWordsPanel';
import { StartGamePanel } from './StartGamePanel';

/**
 * Said in a room whose words have been dealt out and is being played.
 *
 * The room's other two states have no line of their own here: a lobby says
 * different things to the owner and to everybody else, so it is put together by
 * {@link lobbyStatusMessage}, and a closed room has a panel or a notice of its
 * own, beside which one more line would only say the same thing twice.
 */
const PLAYING_MESSAGE = 'The game is on.';

/**
 * Said in a room that is closed without its crossword having been finished.
 *
 * Nothing an honest game does produces this: the game is closed by clients that
 * can see a full board, so a full board is what a closed room normally has. It
 * takes a client writing `completed` over a room that was never played, which
 * the security rules cannot refuse (see
 * `docs/decisions/0012-ending-a-game-from-the-received-state.md`). The room is
 * closed for good either way — `completed` is terminal — so the players are
 * told that plainly, and the words nobody answered are not spelled out, because
 * from here there is no way to tell an odd game from a spoiled one.
 */
const CLOSED_UNFINISHED_MESSAGE =
  'This room is closed. It was closed before every word had been answered, so the words that were never guessed are not shown — ask whoever invited you for a link to a new game.';

/** The line under the grid, which is about what the squares are for right now. */
const gridCaption = (wordCount: number, isFinished: boolean, isClosed: boolean): string => {
  if (isFinished) {
    return `All ${wordCount} words of this grid are in place.`;
  }

  if (isClosed) {
    return `Of the ${wordCount} words of this grid, the ones that were answered are in place; the rest stay blank.`;
  }

  return `${wordCount} words are hidden in this grid. Type your own into the squares that take letters; a word's letters appear for everybody once it has been answered.`;
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
  const isOwner = viewerId === room.ownerId;
  const wordCount = room.layout.placedWords.length;
  // Two questions, and they come apart in the one case the rules cannot refuse:
  // a room can be closed without its crossword having been finished. What the
  // room is done with follows the status; what may be spelled out follows the
  // board, which is the half a client cannot fake.
  const isClosed = status === 'completed';
  const isFinished = isGameFinished(room);

  return (
    <Stack spacing={3}>
      {isFinished && (
        <GameCompletedPanel words={finishedWordsOf(room)} playerCount={players.length} />
      )}

      {isClosed && !isFinished && (
        <Alert severity="info" role="status">
          {CLOSED_UNFINISHED_MESSAGE}
        </Alert>
      )}

      {!isClosed && (
        <Typography variant="body1" role="status">
          {isWaitingToStart
            ? lobbyStatusMessage({ isOwner, playerCount: players.length, wordCount })
            : PLAYING_MESSAGE}
        </Typography>
      )}

      <PlayerList players={players} ownerId={room.ownerId} viewerId={viewerId} />

      {isWaitingToStart && isOwner && (
        <StartGamePanel
          playerCount={players.length}
          wordCount={wordCount}
          onStart={onStartGame}
          isStarting={isStartingGame}
          errorMessage={startGameError}
        />
      )}

      {/* Both of these are about a game still being played — what each player
          has left to do. A closed room says it all once, up top, and asking
          somebody to explain a word to a room that is finished with them would
          be worse than saying nothing. */}
      {!isClosed && wordView.kind === 'dealt' && <PlayerWordsPanel view={wordView} />}

      {!isClosed && wordView.kind === 'left-out' && (
        <Alert severity="info">{LEFT_OUT_MESSAGE}</Alert>
      )}

      <section aria-labelledby="grid-heading">
        <Typography id="grid-heading" variant="h6" component="h2">
          The crossword
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {gridCaption(wordCount, isFinished, isClosed)}
        </Typography>

        <CrosswordGrid view={gridView} onSolved={onSolveWord} />

        {solveWordError !== undefined && <Alert severity="error">{solveWordError}</Alert>}
      </section>
    </Stack>
  );
};
