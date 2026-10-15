import Box from '@mui/material/Box';
import type { CSSObject } from '@mui/material/styles';

import { type RoomPlayerEntry, PLAYERS_PER_GAME } from '../rooms/room-access';
import { inRem } from '../scale';
import { STREET } from '../street';
import { lobbyHeadingSx, playerRowSx } from './lobby-styles';
import { OUTLINE_WIDTH } from './surface-styles';

/** Which of the three marks a row carries (`.mk`, template lines 169-171). */
type Mark = 'present' | 'away' | 'empty';

/**
 * The mark in front of a name: a circle 11px across. Present is filled ochre
 * with an ink ring, away is a hollow ink ring, and an open seat is a hollow
 * slate ring at 70%. The mark is drawn by shape and never by colour alone: the
 * words beside it say the same.
 */
const MARK_SX: Record<Mark, CSSObject> = {
  present: { backgroundColor: STREET.ochre, boxShadow: `0 0 0 ${OUTLINE_WIDTH}px ${STREET.ink}` },
  away: {
    backgroundColor: 'transparent',
    boxShadow: `inset 0 0 0 ${OUTLINE_WIDTH}px ${STREET.ink}`,
  },
  empty: {
    backgroundColor: 'transparent',
    boxShadow: `inset 0 0 0 ${OUTLINE_WIDTH}px ${STREET.slate}`,
    opacity: 0.7,
  },
};

const MarkDot = ({ mark }: { readonly mark: Mark }) => (
  <Box
    component="span"
    aria-hidden
    sx={{
      flex: 'none',
      alignSelf: 'center',
      width: inRem(11),
      height: inRem(11),
      borderRadius: '50%',
      ...MARK_SX[mark],
    }}
  />
);

interface LobbyPlayersProps {
  /** Players of the room, in the order they joined. */
  readonly players: readonly RoomPlayerEntry[];
  /** UID of the player who created the room. */
  readonly ownerId: string;
  /** UID of the player looking at the screen. */
  readonly viewerId: string;
  /** How long each away player has been away, by player id, from `useRoomPresence`. */
  readonly awayDurations: Readonly<Record<string, string>>;
}

/**
 * Who is in the room, drawn as the template's `players` block (lines 674-688):
 * a name at 21px bold with its tags ("host", "you") in slate, a mark in front,
 * "away for 2 min" at the far end of an away player's row, and a row for the
 * seat that is still free.
 *
 * The game room and both endings draw the same block (the template's `playing`,
 * `finished` and `closed-early` all call the same `players`, issues #228 and
 * #229).
 *
 * @param props.players - Players in join order
 * @param props.ownerId - The player who is the host
 * @param props.viewerId - The reader, tagged "you"
 * @param props.awayDurations - How long each away player has been quiet
 *
 * @example
 * <LobbyPlayers players={playersInJoinOrder(room)} ownerId={room.ownerId} viewerId={uid} awayDurations={{}} />
 */
export const LobbyPlayers = ({ players, ownerId, viewerId, awayDurations }: LobbyPlayersProps) => (
  <section aria-labelledby="players-heading">
    <Box component="h2" id="players-heading" sx={lobbyHeadingSx}>
      In the room
    </Box>
    <Box component="p" sx={{ margin: 0, fontSize: inRem(16), color: STREET.slate }}>
      {`A game is played by exactly ${PLAYERS_PER_GAME} people.`}
    </Box>

    <Box component="ul" sx={{ listStyle: 'none', margin: `${inRem(8)} 0 0`, padding: 0 }}>
      {players.map((player) => {
        const away = awayDurations[player.id];
        const tags = [player.id === ownerId && 'host', player.id === viewerId && 'you']
          .filter(Boolean)
          .join(', ');

        return (
          <Box component="li" key={player.id} sx={playerRowSx}>
            <MarkDot mark={away === undefined ? 'present' : 'away'} />
            <Box component="span" sx={{ fontSize: inRem(21), fontWeight: 700 }}>
              {player.nickname}
            </Box>
            {tags !== '' && (
              <Box component="span" sx={{ fontSize: inRem(15), color: STREET.slate }}>
                {tags}
              </Box>
            )}
            {away !== undefined && (
              <Box
                component="span"
                sx={{
                  marginInlineStart: 'auto',
                  fontSize: inRem(15),
                  fontStyle: 'italic',
                  color: STREET.slate,
                }}
              >
                {`away for ${away}`}
              </Box>
            )}
          </Box>
        );
      })}

      {players.length < PLAYERS_PER_GAME && (
        <Box component="li" sx={playerRowSx}>
          <MarkDot mark="empty" />
          <Box
            component="span"
            sx={{ fontSize: inRem(17), fontStyle: 'italic', color: STREET.slate }}
          >
            A free seat. Waiting for the second player
          </Box>
        </Box>
      )}
    </Box>
  </section>
);
