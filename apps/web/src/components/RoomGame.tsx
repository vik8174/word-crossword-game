import { isTeacherOf } from '../rooms/room-document';
import { PlayerGame } from './PlayerGame';
import type { RoomGameProps } from './room-game-props';
import { TeacherGame } from './TeacherGame';

/**
 * A game in progress, for whoever is looking at it.
 *
 * Two screens stand behind one name. A player gets their own half of the game
 * and the grid they type into (`PlayerGame`): the words they explain on one side
 * of the board, the words they guess on the other. A lesson's teacher plays
 * nothing, and gets every word of the crossword and the one thing they can do
 * about it, which is to end it (`TeacherGame`). Which of the two is decided by
 * one question asked of the room and the viewer, `isTeacherOf`, the same key as
 * the word view's (`wordViewFor`), so the screen and the words it may show
 * cannot disagree about who the teacher is.
 *
 * Kept as two components and not as one with a branch at its top: each holds
 * hooks of its own, and a teacher is never a player who was shown less.
 *
 * @param props.roomId - Id of the room being played
 * @param props.room - The room document
 * @param props.viewerId - Who is reading
 * @param props.writes - The two writes; the workshop's way to draw a refused one
 *
 * @example
 * <RoomGame roomId={roomId} room={room} viewerId={playerId} />
 */
export const RoomGame = (props: RoomGameProps) =>
  isTeacherOf(props.room, props.viewerId) ? <TeacherGame {...props} /> : <PlayerGame {...props} />;
