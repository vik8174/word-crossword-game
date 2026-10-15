import Box from '@mui/material/Box';
import { Link as RouterLink } from 'react-router-dom';

import { finishedGridCaption } from '../rooms/grid-caption';
import { finishedGameSummary } from '../rooms/game-summary';
import { playersInJoinOrder } from '../rooms/room-access';
import type { RoomDocument } from '../rooms/room-document';
import { finishedWordsOf } from '../rooms/word-visibility';
import { FiestaCard } from './FiestaCard';
import { useFrameSlot } from './frame-slot';
import { LobbyPlayers } from './LobbyPlayers';
import { PillButton } from './PillButton';
import { RoomCrossword } from './RoomCrossword';
import { RoomShell } from './RoomShell';
import { Street } from './Street';

/** What the drawing above the board is called to a reader who cannot see it. */
const FIESTA_LABEL =
  'A fiesta in the street: paper lanterns and confetti, both neighbours cheering, every word hanging on the line';

/** The room's own line about the game, in the frame's header; the screen has no action. */
const STATUS = <span role="status">The game is finished</span>;

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
 * @param props.room - The room document
 * @param props.viewerId - Which player is reading, so the list marks them
 *
 * @example
 * <RoomFinished room={room} viewerId={playerId} />
 */
export const RoomFinished = ({ room, viewerId }: RoomFinishedProps) => {
  const players = playersInJoinOrder(room);
  const words = finishedWordsOf(room);

  useFrameSlot({ status: STATUS });

  return (
    <RoomShell
      title="Finished"
      left={
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
      }
      right={
        <LobbyPlayers
          players={players}
          ownerId={room.ownerId}
          viewerId={viewerId}
          awayDurations={NOBODY_AWAY}
        />
      }
    >
      <RoomCrossword
        room={room}
        viewerId={viewerId}
        caption={finishedGridCaption(room.layout.placedWords.length)}
        hasVisibleHeading={false}
        bandRule="always"
        band={<Street crop="band" mood="cheer" fiesta cards={words} label={FIESTA_LABEL} />}
      />
    </RoomShell>
  );
};
