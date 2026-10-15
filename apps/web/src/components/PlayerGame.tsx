import Box from '@mui/material/Box';
import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { answeredSpellings } from '../rooms/answered-spellings';
import { answeredWordsOf } from '../rooms/answered-words';
import { useJustAnswered } from '../rooms/use-just-answered';
import { openGridCaption } from '../rooms/grid-caption';
import { playersInJoinOrder } from '../rooms/room-access';
import { roomModeOf } from '../rooms/room-document';
import { endGameEarly as endTheGame, recordGuess as recordTheGuess } from '../rooms/room-service';
import { useEnding } from '../rooms/use-ending';
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
import type { RoomGameProps } from './room-game-props';
import { RoomCrossword } from './RoomCrossword';
import { RoomShell } from './RoomShell';
import { Street } from './Street';
import { type LessonView, roomStreetLabel, teacherDrawnFor } from './street-labels';
import { WordsToExplainPanel } from './WordsToExplainPanel';
import { WordsToGuessPanel } from './WordsToGuessPanel';

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

/**
 * The room's own line about the game, in the frame's header: the other player's
 * name makes it, and in a lesson the teacher's does too
 * (`design/templates/state-tree.html`, line 1031).
 */
const statusFor = (otherName: string | undefined, teacherName: string | undefined): string => {
  const playing = otherName === undefined ? 'Playing' : `Playing with ${otherName}`;

  return teacherName === undefined ? playing : `${playing}. ${teacherName} is watching.`;
};

/**
 * Said to a student whose teacher's mark is old: the game goes on, and only
 * the teacher can end it (`playing/teacheraway`, template line 1013).
 */
const TEACHER_AWAY_MESSAGE =
  'The game goes on without your teacher watching. Only the teacher can end it.';

/**
 * A game in progress as a player sees it: this player's own words, and the grid
 * they type into. `RoomGame` hands a lesson's teacher the screen that is theirs
 * (`TeacherGame`) and everybody else this one.
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
 * (`docs/decisions/0027-a-game-a-player-can-end.md`). A student in a lesson has
 * no such control anywhere: only the teacher ends a lesson, and the rules refuse
 * anybody else's write (`docs/decisions/0037-a-lesson-is-run-by-a-teacher-who-does-not-play.md`).
 * Their header says who is watching, their list of people holds the teacher's
 * row, and the street shows the teacher at the end of it, at their window or
 * behind curtains while their mark is old, with a notice that says so.
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
 * <PlayerGame roomId={roomId} room={room} viewerId={playerId} />
 */
export const PlayerGame = ({
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
  const awayDurations = useRoomPresence(room);
  const players = playersInJoinOrder(room);
  const wordView = wordViewFor(room, viewerId);
  const placedCount = room.layout.placedWords.length;
  const playerCount = Object.keys(room.players).length;
  const mode = roomModeOf(room);
  const otherName = players.find((player) => player.id !== viewerId)?.nickname;
  const isLeftOut = wordView.kind === 'left-out';
  // The teacher of a lesson stands outside `players`, so the list, the header and
  // the street are each told about them apart from the two who play.
  const teacher =
    room.teacher === undefined ? undefined : { id: room.ownerId, nickname: room.teacher.nickname };
  const isTeacherAway = teacher !== undefined && awayDurations[teacher.id] !== undefined;
  const lesson: LessonView | undefined =
    teacher === undefined ? undefined : { viewer: 'student', teacherAway: isTeacherAway };

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

  // Reported apart from `game_completed`, and carrying the same two counts: a
  // game somebody ended is not a game that was finished, and one number meaning
  // both would measure nothing (`docs/decisions/0027-a-game-a-player-can-end.md`).
  const end = useCallback(async () => {
    await endGameEarly(roomId);
    void logGameEvent('game_closed', {
      word_count: placedCount,
      player_count: playerCount,
      mode,
    });
  }, [endGameEarly, roomId, placedCount, playerCount, mode]);
  const { isEnding, endError, endGame } = useEnding(end);

  // The header is the frame's: what the room is doing, and the one thing this
  // player can do about it. A player the deal left out has neither, there being
  // no game of theirs to end (`playing/leftout`), and neither has a student of a
  // lesson, whose teacher alone ends it.
  const teacherName = teacher?.nickname;
  const status = useMemo(
    () => (isLeftOut ? undefined : <span role="status">{statusFor(otherName, teacherName)}</span>),
    [isLeftOut, otherName, teacherName],
  );
  const hasEnding = !isLeftOut && lesson === undefined;
  const action = useMemo(
    () =>
      hasEnding ? (
        <EndGamePanel
          onEnd={() => {
            void endGame();
          }}
          isEnding={isEnding}
          errorMessage={endError ?? undefined}
        />
      ) : undefined,
    [hasEnding, endGame, isEnding, endError],
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
  // The card of the word answered while this screen was open, pegged on the line.
  const justAnswered = useJustAnswered(answeredWords);

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

      {teacher !== undefined && isTeacherAway && (
        <Message kind="info" heading={`${teacher.nickname} is away`} role="status">
          {TEACHER_AWAY_MESSAGE}
        </Message>
      )}

      <LobbyPlayers
        players={players}
        ownerId={room.ownerId}
        viewerId={viewerId}
        awayDurations={awayDurations}
        teacher={teacher}
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
        band={
          <Street
            crop="band"
            mood="talk"
            cards={answeredWords}
            justAnswered={justAnswered}
            teacher={lesson === undefined ? undefined : teacherDrawnFor(lesson)}
            label={roomStreetLabel(lesson)}
          />
        }
      />
    </RoomShell>
  );
};
