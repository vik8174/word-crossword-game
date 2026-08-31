import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { PLAYERS_PER_GAME, type RoomPlayerEntry } from '../rooms/room-access';

interface PlayerListProps {
  /** Players of the room, in the order they joined. */
  readonly players: readonly RoomPlayerEntry[];
  /** UID of the player who created the room. */
  readonly ownerId: string;
  /** UID of the player looking at the screen. */
  readonly viewerId: string;
  /**
   * How long each away player has been away, by player id, from
   * `useRoomPresence`. A player who is present has no entry.
   *
   * Left out entirely by a screen that tracks nothing — a finished room, where
   * nobody is marking themselves present any more and every name would go quiet
   * within the minute, saying only that the game is over.
   */
  readonly awayDurations?: Readonly<Record<string, string>>;
}

/**
 * Who is in the room, updating as players arrive.
 *
 * Everyone sees the same list — players talk to each other out loud while they
 * play, so knowing who is already in is what tells them whether to wait.
 *
 * Only a deviation is labelled. `you`, `host` and a player who has gone quiet
 * are all things one row can say and another cannot; a label every row carried
 * would be read as decoration and tell nobody anything, which is what
 * `Players (2 of 4)` was fixed for (issue #29).
 *
 * @param props.players - Players in join order
 * @param props.viewerId - Marks which entry is the reader themselves
 * @param props.awayDurations - How long each away player has been quiet, if the
 * screen is one where presence is being marked at all
 *
 * @example
 * <PlayerList players={playersInJoinOrder(room)} ownerId={room.ownerId} viewerId={playerId} />
 */
export const PlayerList = ({ players, ownerId, viewerId, awayDurations = {} }: PlayerListProps) => {
  return (
    <section aria-labelledby="players-heading">
      <Typography id="players-heading" variant="h2" component="h2" sx={{ mb: 1 }}>
        {`Players (${players.length})`}
      </Typography>
      {/* The size, said as a requirement. It can be wrong in either direction:
          `N of 4` read as progress towards a fourth player a game never needed
          (issue #29), and "up to 2" would read as a ceiling, offering a second
          player this game cannot do without. Neither is what the number is:
          a game is played by two, and that is settled rather than pending
          (docs/decisions/0024-two-players-are-the-product-not-the-algorithm.md),
          which is what lets the sentence say "exactly". */}
      <Typography variant="body2" color="text.secondary">
        {`A game is played by exactly ${PLAYERS_PER_GAME} people.`}
      </Typography>

      <List dense>
        {players.map((player) => (
          <ListItem key={player.id} disableGutters>
            <ListItemText
              primary={
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                  <span>{player.nickname}</span>
                  {player.id === viewerId && <Chip label="you" size="small" />}
                  {player.id === ownerId && <Chip label="host" size="small" variant="outlined" />}
                  {awayDurations[player.id] !== undefined && (
                    <Chip
                      label={`away for ${awayDurations[player.id]}`}
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  )}
                </Stack>
              }
            />
          </ListItem>
        ))}
      </List>
    </section>
  );
};
