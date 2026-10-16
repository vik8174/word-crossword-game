import Box from '@mui/material/Box';
import { useCallback, useMemo } from 'react';

import { answeredWordsOfWatched } from '../rooms/answered-words';
import { watchedGridCaption } from '../rooms/grid-caption';
import { ownerNicknameOf, playersInJoinOrder } from '../rooms/room-access';
import { roomModeOf } from '../rooms/room-document';
import { endGameEarly as endTheGame, recordGuess as recordTheGuess } from '../rooms/room-service';
import { useEnding } from '../rooms/use-ending';
import { useGameCompletion } from '../rooms/use-game-completion';
import { useJustAnswered } from '../rooms/use-just-answered';
import { useRoomPresence } from '../rooms/use-room-presence';
import { wordViewFor } from '../rooms/word-visibility';
import { logGameEvent } from '../telemetry/analytics';
import { EndGamePanel } from './EndGamePanel';
import { useFrameSlot } from './frame-slot';
import { gateStackSx } from './gate-panel-styles';
import { LobbyPlayers } from './LobbyPlayers';
import { OwnPresenceNotice } from './OwnPresenceNotice';
import type { RoomGameProps } from './room-game-props';
import { RoomCrossword } from './RoomCrossword';
import { RoomShell } from './RoomShell';
import { Street } from './Street';
import { roomStreetLabel } from './street-labels';
import { TeacherWordsPanel } from './TeacherWordsPanel';

/**
 * What the teacher's header says when the lesson shows nobody to name: the room
 * is not one this app dealt (a lesson that holds fewer than its two students).
 */
const WATCHING_ONLY = 'You are watching.';

/**
 * A lesson in progress as its teacher sees it: every word of the crossword,
 * marked by who explains it, and the one thing they can do about it, which is
 * to end it (`playing`, `playing/confirm`, `playing/ending`, `playing/endfail`
 * and `playing/away` of `design/templates/state-tree.html` with `?mode=lesson`,
 * lines 996-1006).
 *
 * The teacher plays nothing, so this is no player's screen shown less and no
 * player's screen shown more. The left of the board is the first student's words
 * and the right the second's, each in full with whether it is answered, from the
 * one view that says so (`wordViewFor`, the `watched` case); the board between
 * them is the teacher's (`TeacherGrid`), which nothing can be typed into; the
 * band over it has the teacher at the end of the street, always at their window
 * on their own screen. Nothing is theirs to type, tap or pick: the words are
 * rows, not buttons, because they do nothing.
 *
 * Two writes are made from here and no others. The room's finish is watched for,
 * as on every screen that holds a game, since whoever sees a full board writes
 * the same `completed` (`docs/decisions/0012-ending-a-game-from-the-received-state.md`).
 * The other is the ending the teacher asks for, which is reported as
 * `game_closed` with the mode `lesson`, once the write has come back.
 *
 * @param props.roomId - Id of the room being watched
 * @param props.room - The room document
 * @param props.viewerId - The teacher's UID
 * @param props.writes - The two writes; only `endGameEarly` is used here, and the workshop hands in one to draw a refused ending
 *
 * @example
 * <TeacherGame roomId={roomId} room={room} viewerId={room.ownerId} />
 */
export const TeacherGame = ({
  roomId,
  room,
  viewerId,
  writes = { recordGuess: recordTheGuess, endGameEarly: endTheGame },
}: RoomGameProps) => {
  const awayDurations = useRoomPresence(room);
  const players = playersInJoinOrder(room);
  const wordView = wordViewFor(room, viewerId);
  const teacher = { id: room.ownerId, nickname: ownerNicknameOf(room) };
  const { endGameEarly } = writes;
  const nickname = (id: string) => players.find((player) => player.id === id)?.nickname ?? '';
  const [leftName, rightName] =
    wordView.kind === 'watched'
      ? [nickname(wordView.left.explainerId), nickname(wordView.right.explainerId)]
      : ['', ''];

  useGameCompletion(roomId, room);

  // Reported as a player's ending is, with the same two counts and the mode of a
  // lesson: the teacher alone ends one, so this is the only place a lesson's
  // `game_closed` can come from. After the write came back, so an ending that
  // was refused is not counted.
  const placedCount = room.layout.placedWords.length;
  const playerCount = Object.keys(room.players).length;
  const mode = roomModeOf(room);
  const end = useCallback(async () => {
    await endGameEarly(roomId);
    void logGameEvent('game_closed', {
      word_count: placedCount,
      player_count: playerCount,
      mode,
    });
  }, [endGameEarly, roomId, placedCount, playerCount, mode]);
  const { isEnding, endError, endGame } = useEnding(end);

  const status = useMemo(
    () => (
      <span role="status">
        {wordView.kind === 'watched'
          ? `${leftName} and ${rightName} are playing. You are watching.`
          : WATCHING_ONLY}
      </span>
    ),
    [wordView.kind, leftName, rightName],
  );
  const action = useMemo(
    () => (
      <EndGamePanel
        isLesson
        onEnd={() => {
          void endGame();
        }}
        isEnding={isEnding}
        errorMessage={endError ?? undefined}
      />
    ),
    [endGame, isEnding, endError],
  );
  useFrameSlot({ status, action, plainWordmark: true });

  // The cards on the line: every answered word, the teacher having every word to name.
  const answeredWords = useMemo(() => answeredWordsOfWatched(wordView), [wordView]);
  const justAnswered = useJustAnswered(answeredWords);

  return (
    <RoomShell
      isTeachers
      left={
        <Box sx={gateStackSx}>
          <OwnPresenceNotice awayDuration={awayDurations[viewerId]} />

          {wordView.kind === 'watched' && (
            <TeacherWordsPanel
              face="left"
              explainerName={leftName}
              guesserName={rightName}
              words={wordView.left.words}
            />
          )}
        </Box>
      }
      right={
        <Box sx={gateStackSx}>
          <LobbyPlayers
            players={players}
            ownerId={room.ownerId}
            viewerId={viewerId}
            awayDurations={awayDurations}
            teacher={teacher}
          />

          {wordView.kind === 'watched' && (
            <TeacherWordsPanel
              face="right"
              explainerName={rightName}
              guesserName={leftName}
              words={wordView.right.words}
            />
          )}
        </Box>
      }
    >
      <RoomCrossword
        room={room}
        viewerId={viewerId}
        caption={watchedGridCaption(room.layout.placedWords.length)}
        hasVisibleHeading={false}
        watching={{ leftName, rightName }}
        band={
          <Street
            crop="band"
            mood="talk"
            cards={answeredWords}
            justAnswered={justAnswered}
            teacher="here"
            label={roomStreetLabel({ viewer: 'teacher' })}
          />
        }
      />
    </RoomShell>
  );
};
