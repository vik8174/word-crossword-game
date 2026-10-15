import Box from '@mui/material/Box';
import { Link as RouterLink } from 'react-router-dom';

import { finishedGridCaption } from '../rooms/grid-caption';
import { finishedGameSummary } from '../rooms/game-summary';
import { ownerNicknameOf, playersInJoinOrder } from '../rooms/room-access';
import { isTeacherOf, type RoomDocument, roomModeOf } from '../rooms/room-document';
import { NEW_LESSON_PATH } from '../rooms/room-link';
import { finishedWordsOf } from '../rooms/word-visibility';
import { inRem } from '../scale';
import { FiestaCard } from './FiestaCard';
import { useFrameSlot } from './frame-slot';
import { LessonSummary } from './LessonSummary';
import { LobbyPlayers } from './LobbyPlayers';
import { PillButton } from './PillButton';
import { RoomCrossword } from './RoomCrossword';
import { RoomShell } from './RoomShell';
import { Street } from './Street';
import { endingStreetLabel } from './street-labels';

/** What the drawing above the board is called to a reader who cannot see it. */
const FIESTA_LABEL =
  'A fiesta in the street: paper lanterns and confetti, both neighbours cheering, every word hanging on the line';

/** The room's own line about the game, in the frame's header; the screen has no action. */
const STATUS = <span role="status">The game is finished</span>;

/** The same line in a lesson, for the teacher and for the students alike. */
const LESSON_STATUS = <span role="status">The lesson is finished</span>;

/** Nobody is away on an ending: the room's presence stopped being read with the game. */
const NOBODY_AWAY = {};

interface RoomFinishedProps {
  /** The room, closed with its crossword full. */
  readonly room: RoomDocument;
  /** UID of the player looking at it. */
  readonly viewerId: string;
}

/**
 * A game that was played to the end: a fiesta in the street, and the whole
 * crossword, spelled out at last.
 *
 * The card says "You did it!" in the interface's language (Viktor, 2026-10-14)
 * and carries every word as a tile. The drawing above the board is the whole
 * street at a fiesta, with every word hanging on the line, and it is always
 * shown: nobody types here, so the board gives way to it
 * (`boardHeightsFor` in `board-geometry.ts`). The fiesta arrives when the game
 * finishes under the player's eyes and stands, with only the flags and the
 * lanterns swaying, when the room is opened finished (`ScreenEnter`).
 *
 * It takes no callbacks because there is nothing left to call. The room is
 * closed for good, since `completed` is terminal in the security rules, and the
 * words that were secret all game are named only because {@link finishedWordsOf}
 * checked the board and not the status
 * (`docs/decisions/0012-ending-a-game-from-the-received-state.md`). The one
 * thing offered is a new game, at `/`
 * (`docs/decisions/0041-an-ending-offers-a-new-game.md`).
 *
 * A lesson ends the same way, with three differences. The teacher is at the end
 * of the street and in the list, always, for everybody: marks stop being read
 * when a game ends, so they are not asked about. The status says "The lesson is
 * finished". And the teacher, who played nothing, is not told "You did it!"
 * but "They did it!", over the lesson summary (`LessonSummary`) in place of the
 * tiles, with "Start a new lesson" at `/create` with a lesson chosen
 * (`NEW_LESSON_PATH`). A student's screen is the pair game's with the first two
 * differences.
 *
 * @param props.room - The room document
 * @param props.viewerId - Which player is reading, so the list marks them
 *
 * @example
 * <RoomFinished room={room} viewerId={playerId} />
 */
export const RoomFinished = ({ room, viewerId }: RoomFinishedProps) => {
  const players = playersInJoinOrder(room);
  const words = finishedWordsOf(room);
  const isLesson = roomModeOf(room) === 'lesson';
  const isTeacher = isTeacherOf(room, viewerId);
  const teacher = isLesson ? { id: room.ownerId, nickname: ownerNicknameOf(room) } : undefined;

  useFrameSlot({ status: isLesson ? LESSON_STATUS : STATUS });

  return (
    <RoomShell
      title="Finished"
      left={
        isTeacher ? (
          <>
            <FiestaCard headline="They did it!" words={[]}>
              {`Your players finished the crossword together: all ${words.length} of its words.`}
            </FiestaCard>

            <Box sx={{ marginTop: inRem(4) }}>
              <LessonSummary room={room} viewerId={viewerId} />
            </Box>

            <Box>
              <PillButton component={RouterLink} to={NEW_LESSON_PATH}>
                Start a new lesson
              </PillButton>
            </Box>
          </>
        ) : (
          <>
            <FiestaCard headline="You did it!" words={words}>
              {finishedGameSummary(words.length, players.length)}
            </FiestaCard>

            <Box>
              <PillButton component={RouterLink} to="/">
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
      <RoomCrossword
        room={room}
        viewerId={viewerId}
        caption={finishedGridCaption(room.layout.placedWords.length)}
        hasVisibleHeading={false}
        bandRule="always"
        band={
          <Street
            crop="band"
            mood="cheer"
            fiesta
            cards={words}
            teacher={isLesson ? 'here' : undefined}
            label={endingStreetLabel(FIESTA_LABEL, isLesson)}
          />
        }
      />
    </RoomShell>
  );
};
