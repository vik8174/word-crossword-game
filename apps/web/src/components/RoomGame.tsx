import Box from '@mui/material/Box';
import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { answeredSpellings } from '../rooms/answered-spellings';
import { answeredWordsOf } from '../rooms/answered-words';
import { openGridCaption } from '../rooms/grid-caption';
import { playersInJoinOrder } from '../rooms/room-access';
import type { RoomDocument } from '../rooms/room-document';
import { endGameEarly as endTheGame, recordGuess as recordTheGuess } from '../rooms/room-service';
import { useGameCompletion } from '../rooms/use-game-completion';
import { useRoomPresence } from '../rooms/use-room-presence';
import { gridViewFor, type WordLocation, wordViewFor } from '../rooms/word-visibility';
import { logGameEvent } from '../telemetry/analytics';
import { EndGamePanel } from './EndGamePanel';
import { useFrameSlot } from './frame-slot';
import { gateStackSx } from './gate-panel-styles';
import { LobbyPlayers } from './LobbyPlayers';
import { Message } from './Message';
import { OwnPresenceNotice } from './OwnPresenceNotice';
import { RoomCrossword } from './RoomCrossword';
import { RoomShell } from './RoomShell';
import { Street } from './Street';
import { WordsToExplainPanel } from './WordsToExplainPanel';
import { WordsToGuessPanel } from './WordsToGuessPanel';

/** What the drawing above the board is called to a reader who cannot see it. */
const BAND_LABEL = 'The answered words hanging on the line between the two balconies';

/**
 * Said to a player who is in the room but in nobody's assignment — they joined
 * in the instant between the owner reading the room and dealing the words out.
 * Every word would read as theirs to explain, so they are shown none of them.
 */
const LEFT_OUT_MESSAGE =
  'It was dealt out just as you arrived, so none of its words are yours to explain or guess, and none of them are shown here. Ask the others for a link to the next game.';

// Firestore keeps retrying a write it merely could not send, so a rejection
// here means the database refused it outright — most likely an expired room.
// The heading is `RoomCrossword`'s own — "Your answer was not saved", fixed.
const GUESS_FAILED_MESSAGE =
  'It was right, but the other player could not be told. The room may have expired. Reload the page to see where the game stands.';

// The same kind of rejection, with one more cause worth naming: the rules
// refuse to move a room that has already ended, so the other player finishing
// the crossword in the same second arrives here too. Said in the dialog that
// asked for it.
const END_FAILED_MESSAGE =
  'The game could not be ended. The room may have expired, or it may have ended already. Reload the page to see where it stands.';

/** The room's own line about the game, in the frame's header; the other player's name makes it. */
const statusFor = (otherName: string | undefined): string =>
  otherName === undefined ? 'Playing' : `Playing with ${otherName}`;

interface RoomGameProps {
  /** Id of the room, for the answers and the ending this screen writes. */
  readonly roomId: string;
  /** The room as it stands, following live updates from Firestore. */
  readonly room: RoomDocument;
  /** UID of the player looking at it, so they see their own half of the game. */
  readonly viewerId: string;
  /**
   * The two writes a game makes. `recordGuess` and `endGameEarly` unless given:
   * handed in only by the workshop, so that the screens behind a refused write
   * (`playing/guessfail`, `playing/endfail`) and the one mid-write
   * (`playing/ending`) can be drawn without a database, which cannot be made to
   * refuse one (`updateDoc` queues a write that cannot be sent).
   */
  readonly writes?: {
    readonly recordGuess: typeof recordTheGuess;
    readonly endGameEarly: typeof endTheGame;
  };
}

/**
 * A game in progress: this player's own words, and the grid they type into.
 *
 * Every player reads the same document, so what separates them is drawn here
 * and nowhere else: the words a player explains are written into their own grid
 * and nobody else's, the squares they type into are their own, and no letter of
 * a word hidden from them reaches their screen before it has been answered (see
 * {@link RoomCrossword}).
 *
 * All three writes a game makes belong to this screen. Answers are one of them;
 * the second is the ending the full board asks for, which is watched for here
 * rather than one screen up, so that only somebody actually playing closes a
 * game (`docs/decisions/0012-ending-a-game-from-the-received-state.md` says who
 * may write it, not who has to be watching).
 *
 * The third is the ending a player asks for, and it is on this screen for a
 * reason of its own: a game is the only thing there is to end. A lobby has
 * nothing stuck in it — a guest's seat frees itself and a host simply goes —
 * and a room that has already ended has nothing left to write
 * (`docs/decisions/0027-a-game-a-player-can-end.md`).
 *
 * It also holds the one thing the two indexes and the grid have to agree on:
 * which word the player last asked to be taken to. They are three components
 * around one board, so the request passes through here — as a location and
 * never as a word, so nothing that could be spelled out travels between them
 * (`docs/decisions/0016-the-cursor-lives-in-the-grid.md`).
 *
 * The screen is laid out as the game is (issue #101): what this player gives
 * the other one on the left of the board, what they get back on the right. That
 * is also why the two halves are two components — they no longer sit anywhere
 * near each other.
 *
 * @param props.roomId - Id of the room being played
 * @param props.room - The room document
 * @param props.viewerId - Which player is reading, so they see their own words
 * @param props.writes - The two writes; the workshop's way to draw a refused one
 *
 * @example
 * <RoomGame roomId={roomId} room={room} viewerId={playerId} />
 */
export const RoomGame = ({
  roomId,
  room,
  viewerId,
  writes = { recordGuess: recordTheGuess, endGameEarly: endTheGame },
}: RoomGameProps) => {
  // Only ever a failure: a right answer needs no confirmation on this screen —
  // it turns into letters in the grid, for everybody at once.
  const [guessError, setGuessError] = useState<string | null>(null);
  // Where the panel last sent the player. Kept as a value of its own rather
  // than as the word it came from: the words are worked out afresh on every
  // update of the room, and the grid would then be dragged back to the same
  // square every time anybody answered anything.
  const [wordToReach, setWordToReach] = useState<WordLocation | null>(null);
  // Kept apart from the answer's failure: they are two different sentences
  // about two different writes, and either may be the one that failed.
  const [endError, setEndError] = useState<string | null>(null);
  const [isEnding, setIsEnding] = useState(false);
  const awayDurations = useRoomPresence(room);
  const players = playersInJoinOrder(room);
  const wordView = wordViewFor(room, viewerId);
  const placedCount = room.layout.placedWords.length;
  const playerCount = Object.keys(room.players).length;
  const otherName = players.find((player) => player.id !== viewerId)?.nickname;
  const isLeftOut = wordView.kind === 'left-out';

  // Watches the room that arrives rather than the answer this player sent: the
  // client that answered last is not necessarily the one that can tell the game
  // is over (`docs/decisions/0012-ending-a-game-from-the-received-state.md`).
  useGameCompletion(roomId, room);

  const submitGuess = async (wordId: string) => {
    try {
      await writes.recordGuess({ roomId, playerId: viewerId, wordId });
      setGuessError(null);
    } catch (error) {
      console.error('Recording the answer failed', error);
      setGuessError(GUESS_FAILED_MESSAGE);
      // Rethrown so the grid stops counting this word as written down and can
      // send it again; swallowing it here is what would lose the answer.
      throw error;
    }
  };

  const { endGameEarly } = writes;

  const endGame = useCallback(async () => {
    setIsEnding(true);
    setEndError(null);

    try {
      await endGameEarly(roomId);
      // Reported apart from `game_completed`, and carrying the same two counts:
      // a game somebody ended is not a game that was finished, and one number
      // meaning both would measure nothing
      // (`docs/decisions/0027-a-game-a-player-can-end.md`).
      void logGameEvent('game_closed', {
        word_count: placedCount,
        player_count: playerCount,
      });
    } catch (error) {
      // Not retried on the next snapshot, unlike the ending a full board asks
      // for: this one was a person's decision, and repeating it on their behalf
      // is not this screen's to do.
      console.error('Ending the game failed', error);
      setEndError(END_FAILED_MESSAGE);
      setIsEnding(false);
    }
  }, [endGameEarly, roomId, placedCount, playerCount]);

  // The header is the frame's: what the room is doing, and the one thing this
  // player can do about it. A player the deal left out has neither, there being
  // no game of theirs to end (`playing/leftout`).
  const status = useMemo(
    () => (isLeftOut ? undefined : <span role="status">{statusFor(otherName)}</span>),
    [isLeftOut, otherName],
  );
  const action = useMemo(
    () =>
      isLeftOut ? undefined : (
        <EndGamePanel
          onEnd={() => {
            void endGame();
          }}
          isEnding={isEnding}
          errorMessage={endError ?? undefined}
        />
      ),
    [isLeftOut, endGame, isEnding, endError],
  );
  useFrameSlot({ status, action });

  // The grid as this player may see it, for the spellings of the words they have
  // guessed and for the cards on the line: the same view the board is drawn from.
  const gridView = useMemo(() => gridViewFor(room, viewerId), [room, viewerId]);
  const spellings = useMemo(
    () => (wordView.kind === 'dealt' ? answeredSpellings(gridView, wordView.toGuess) : undefined),
    [gridView, wordView],
  );
  // Every answered word, in the order the board numbers them: the ones this
  // player explained and the ones they guessed.
  const answeredWords = useMemo(() => answeredWordsOf(wordView, gridView), [wordView, gridView]);

  // The two zones the board sits between, and the one thing the deal can leave
  // a player with instead of them. Built as values rather than inline, so it is
  // plain that what a player explains never reaches the right of the board and
  // what they guess never reaches the left.
  const toExplain: ReactNode = (
    <>
      {wordView.kind === 'dealt' && (
        <WordsToExplainPanel words={wordView.toExplain} onSelectWord={setWordToReach} />
      )}

      {wordView.kind === 'left-out' && (
        <Message kind="info" heading="This game is running without you">
          {LEFT_OUT_MESSAGE}
        </Message>
      )}
    </>
  );

  const toGuess: ReactNode = (
    <Box sx={gateStackSx}>
      <OwnPresenceNotice awayDuration={awayDurations[viewerId]} />

      <LobbyPlayers
        players={players}
        ownerId={room.ownerId}
        viewerId={viewerId}
        awayDurations={awayDurations}
      />

      {wordView.kind === 'dealt' && (
        <WordsToGuessPanel
          words={wordView.toGuess}
          onSelectWord={setWordToReach}
          spellings={spellings}
        />
      )}
    </Box>
  );

  return (
    <RoomShell left={toExplain} right={toGuess}>
      <RoomCrossword
        room={room}
        viewerId={viewerId}
        caption={openGridCaption(placedCount)}
        onSolved={submitGuess}
        errorMessage={guessError ?? undefined}
        wordToReach={wordToReach}
        hasVisibleHeading={false}
        band={<Street crop="band" mood="talk" cards={answeredWords} label={BAND_LABEL} />}
      />
    </RoomShell>
  );
};
