import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { MAX_PLAYERS, type RoomPlayerEntry } from '../rooms/room-access';

interface PlayerListProps {
  /** Players of the room, in the order they joined. */
  readonly players: readonly RoomPlayerEntry[];
  /** UID of the player who created the room. */
  readonly ownerId: string;
  /** UID of the player looking at the screen. */
  readonly viewerId: string;
}

/**
 * Who is in the room, updating as players arrive.
 *
 * Everyone sees the same list — players talk to each other out loud while they
 * play, so knowing who is already in is what tells them whether to wait.
 *
 * @param props.players - Players in join order
 * @param props.viewerId - Marks which entry is the reader themselves
 *
 * @example
 * <PlayerList players={playersInJoinOrder(room)} ownerId={room.ownerId} viewerId={playerId} />
 */
export const PlayerList = ({ players, ownerId, viewerId }: PlayerListProps) => {
  return (
    <section aria-labelledby="players-heading">
      <Typography id="players-heading" variant="h6" component="h2">
        {`Players (${players.length})`}
      </Typography>
      {/* The size, said as a requirement. It can be wrong in either direction:
          `N of 4` read as progress towards a fourth player a game never needed
          (issue #29), and "up to 2" would read as a ceiling, offering a second
          player this game cannot do without. The floor and the ceiling are the
          same number, which is what lets the sentence say "exactly" — lifting
          the ceiling (issue #10) rewords this line, not only the constant. */}
      <Typography variant="body2" color="text.secondary">
        {`A game is played by exactly ${MAX_PLAYERS} people.`}
      </Typography>

      <List dense>
        {players.map((player) => (
          <ListItem key={player.id} disableGutters>
            <ListItemText
              primary={
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <span>{player.nickname}</span>
                  {player.id === viewerId && <Chip label="you" size="small" />}
                  {player.id === ownerId && <Chip label="host" size="small" variant="outlined" />}
                </Stack>
              }
            />
          </ListItem>
        ))}
      </List>
    </section>
  );
};
