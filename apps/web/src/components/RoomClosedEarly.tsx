import Box from '@mui/material/Box';
import { useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { answeredWordsOf, answeredWordsOfWatched } from '../rooms/answered-words';
import { closedGridCaption, watchedGridCaption } from '../rooms/grid-caption';
import { ownerNicknameOf, playersInJoinOrder } from '../rooms/room-access';
import { isTeacherOf, type RoomDocument, roomModeOf } from '../rooms/room-document';
import { NEW_LESSON_PATH } from '../rooms/room-link';
import { gridViewFor, wordViewFor } from '../rooms/word-visibility';
import { useFrameSlot } from './frame-slot';
import { gateStackSx } from './gate-panel-styles';
import { LessonSummary } from './LessonSummary';
import { LobbyPlayers } from './LobbyPlayers';
import { Message } from './Message';
import { PillButton } from './PillButton';
import { RoomCrossword } from './RoomCrossword';
import { RoomShell } from './RoomShell';
import { Street } from './Street';
import { endingStreetLabel } from './street-labels';

/** What the drawing above the board is called to a reader who cannot see it. */
const SAGGING_LINE_LABEL =
  'A sagging line between the balconies, holding only the words that were answered';

/** What the drawing is called to the teacher, who reads the line as holding "the answered words". */
const TEACHERS_SAGGING_LINE_LABEL =
  'A sagging line between the balconies, holding only the answered words';

/** The room's own line about the game, in the frame's header; the screen has no action. */
const STATUS = <span role="status">The game was ended</span>;

/** The same line in a lesson, for the teacher and for the students alike. */
const LESSON_STATUS = <span role="status">The lesson was ended</span>;

/** Nobody is away on an ending: the room's presence stopped being read with the game. */
const NOBODY_AWAY = {};

/**
 * Said in a room that ended without its crossword having been finished.
 *
 * Two different rooms arrive here and the message is written for both, because
 * from inside the app there is no telling them apart and no need to. The
 * ordinary one is a game a player ended: a crossword that cannot be finished
 * has a way out, and this screen is where it comes out
 * (`docs/decisions/0027-a-game-a-player-can-end.md`). The other is a room whose
 * `completed` no board backs up, which the security rules cannot refuse: they
 * cannot walk the `words` map, so any client that knows the room id can write
 * it over a game nobody played
 * (`docs/decisions/0012-ending-a-game-from-the-received-state.md`). Either way
 * the room is finished with its players, and either way the words nobody
 * answered stay unspoken.
 *
 * It says nothing about who ended it, and there is no field it could read to:
 * the case this control exists for is a player left on their own, so the one
 * reading this is usually the one who pressed the button, and two people who
 * are both still there say it to each other out loud.
 *
 * With one exception, which the sentence has to name rather than leave the
 * reader to notice: the words *they* were explaining are still written into
 * their own grid, as they were all game
 * (`docs/decisions/0015-explained-words-in-the-grid.md`). Those were never
 * theirs to guess, so nothing is given away, but a message promising a blank
 * board over a board that is not blank would simply be untrue.
 *
 * The template's own text (`state-tree.html`, line 1060).
 */
const CLOSED_UNFINISHED_MESSAGE =
  'It was ended before every word had been answered, and the room is closed for good. The words nobody guessed are not spelled out, apart from the ones that were yours to explain.';

/**
 * Said to a lesson's student in place of {@link CLOSED_UNFINISHED_MESSAGE}: it
 * names who ended it, which the room does know in a lesson, since only the
 * teacher can. The rest of the sentence is the same (`state-tree.html`, line 1060).
 */
const LESSON_CLOSED_MESSAGE =
  'Your teacher ended it before every word had been answered, and the room is closed for good. The words nobody guessed are not spelled out, apart from the ones that were yours to explain.';

interface RoomClosedEarlyProps {
  /** The room, closed with words still unanswered. */
  readonly room: RoomDocument;
  /** UID of the player looking at it. */
  readonly viewerId: string;
}

/**
 * A room shut before its crossword was filled in.
 *
 * Calm where the finished screen is a fiesta: the neighbours rest, the line
 * between the balconies sags, and it holds only the words that were answered.
 * It is never celebrated, and a quiet button offers a new game at `/`
 * (`docs/decisions/0041-an-ending-offers-a-new-game.md`). Like the finished
 * screen it takes no callbacks, for the same reason: the status is terminal, so
 * there is nothing to start, answer or end. What it must not do is spell the
 * crossword out. The board is the only half a client cannot fake, and this
 * board is not full.
 *
 * @param props.room - The room document
 * @param props.viewerId - Which player is reading, so the list marks them
 *
 * @example
 * <RoomClosedEarly room={room} viewerId={playerId} />
 */
export const RoomClosedEarly = ({ room, viewerId }: RoomClosedEarlyProps) => {
  const players = playersInJoinOrder(room);
  const isLesson = roomModeOf(room) === 'lesson';
  const isTeacher = isTeacherOf(room, viewerId);
  const teacherName = ownerNicknameOf(room);
  const teacher = isLesson ? { id: room.ownerId, nickname: teacherName } : undefined;
  const placedCount = room.layout.placedWords.length;
  // The words this reader may name: for a player the ones that were answered, the
  // ones they explained and the ones they guessed, and no other; for a lesson's
  // teacher every answered word, who explained it and who answered it.
  const answeredWords = useMemo(() => {
    const wordView = wordViewFor(room, viewerId);

    return isTeacher
      ? answeredWordsOfWatched(wordView)
      : answeredWordsOf(wordView, gridViewFor(room, viewerId));
  }, [room, viewerId, isTeacher]);
  const watchedNames = useMemo(() => {
    const wordView = wordViewFor(room, viewerId);
    const nameOf = (id: string) => players.find((player) => player.id === id)?.nickname ?? '';

    return wordView.kind === 'watched'
      ? {
          leftName: nameOf(wordView.left.explainerId),
          rightName: nameOf(wordView.right.explainerId),
        }
      : undefined;
  }, [room, viewerId, players]);

  useFrameSlot({ status: isLesson ? LESSON_STATUS : STATUS });

  const street = (
    <Street
      crop="band"
      line="slack"
      mood="calm"
      cards={answeredWords}
      teacher={isLesson ? 'here' : undefined}
      label={endingStreetLabel(
        isTeacher ? TEACHERS_SAGGING_LINE_LABEL : SAGGING_LINE_LABEL,
        isLesson,
      )}
    />
  );

  return (
    <RoomShell
      title="Game ended"
      isTeachers={isTeacher}
      left={
        isTeacher ? (
          <Box sx={gateStackSx}>
            <LessonSummary room={room} viewerId={viewerId} />

            <Box>
              <PillButton kind="quiet" component={RouterLink} to={NEW_LESSON_PATH}>
                Start a new lesson
              </PillButton>
            </Box>
          </Box>
        ) : (
          <>
            <Message
              kind="info"
              heading={isLesson ? `${teacherName} ended the lesson` : 'This game was ended early'}
              role="status"
            >
              {isLesson ? LESSON_CLOSED_MESSAGE : CLOSED_UNFINISHED_MESSAGE}
            </Message>

            <Box>
              <PillButton kind="quiet" component={RouterLink} to="/">
                Start a new game
              </PillButton>
            </Box>
          </>
        )
      }
      right={
        <LobbyPlayers
          players={players}
          ownerId={room.ownerId}
          viewerId={viewerId}
          awayDurations={NOBODY_AWAY}
          teacher={teacher}
        />
      }
    >
      {isTeacher ? (
        <RoomCrossword
          room={room}
          viewerId={viewerId}
          caption={watchedGridCaption(placedCount)}
          hasVisibleHeading={false}
          bandRule="always"
          watching={watchedNames}
          hasTightBoard
          band={street}
        />
      ) : (
        <RoomCrossword
          room={room}
          viewerId={viewerId}
          caption={closedGridCaption(placedCount)}
          hasVisibleHeading={false}
          bandRule="always"
          bandNote={closedGridCaption(placedCount)}
          band={street}
        />
      )}
    </RoomShell>
  );
};
