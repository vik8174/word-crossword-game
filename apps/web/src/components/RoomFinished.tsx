import { finishedGridCaption } from '../rooms/grid-caption';
import { playersInJoinOrder } from '../rooms/room-access';
import type { RoomDocument } from '../rooms/room-document';
import { finishedWordsOf } from '../rooms/word-visibility';
import { GameCompletedPanel } from './GameCompletedPanel';
import { PlayerList } from './PlayerList';
import { RoomCrossword } from './RoomCrossword';
import { RoomShell } from './RoomShell';

interface RoomFinishedProps {
  /** The room, closed with its crossword full. */
  readonly room: RoomDocument;
  /** UID of the player looking at it. */
  readonly viewerId: string;
}

/**
 * A game that was played to the end: the whole crossword, spelled out at last.
 *
 * It takes no callbacks because there is nothing left to call. The room is
 * closed for good — `completed` is terminal in the security rules — so nothing
 * here can be started, answered or written, and the words that were secret all
 * game are named only because {@link finishedWordsOf} checked the board and not
 * the status (`docs/decisions/0012-ending-a-game-from-the-received-state.md`).
 *
 * @param props.room - The room document
 * @param props.viewerId - Which player is reading, so the list marks them
 *
 * @example
 * <RoomFinished room={room} viewerId={playerId} />
 */
export const RoomFinished = ({ room, viewerId }: RoomFinishedProps) => {
  const players = playersInJoinOrder(room);

  return (
    <RoomShell
      title="Finished"
      // The words go where the ones this player was explaining stood all game.
      // There is no secret half left to keep them apart from, so the zone that
      // held one side of the game holds the whole of it.
      left={<GameCompletedPanel words={finishedWordsOf(room)} playerCount={players.length} />}
      right={<PlayerList players={players} ownerId={room.ownerId} viewerId={viewerId} />}
    >
      <RoomCrossword
        room={room}
        viewerId={viewerId}
        caption={finishedGridCaption(room.layout.placedWords.length)}
      />
    </RoomShell>
  );
};
