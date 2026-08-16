import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useParams } from 'react-router-dom';

import { RoomClosedEarly } from '../components/RoomClosedEarly';
import { RoomFinished } from '../components/RoomFinished';
import { RoomGame } from '../components/RoomGame';
import { RoomJoin } from '../components/RoomJoin';
import { RoomLobby } from '../components/RoomLobby';
import { RoomUnavailableNotice } from '../components/RoomUnavailableNotice';
import { roomScreenFor } from '../rooms/room-screen';
import { useRoomConnection } from '../rooms/use-room-connection';

/** Shown while the visitor is being signed in and the first snapshot is on its way. */
const Connecting = () => (
  <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
    <CircularProgress size={24} />
    <Typography variant="body1" role="status">
      Connecting to the game...
    </Typography>
  </Stack>
);

/**
 * Picks the one screen this room is showing, and hands it what it needs.
 *
 * Which screen that is, is not decided here: `roomScreenFor` works it out as a
 * value and this is only the switch that renders it. A phase added to
 * `RoomScreen` and not handled below fails to compile, so nothing can be added
 * to the room and quietly forgotten on the way to the player.
 */
const Room = ({ roomId }: { readonly roomId: string }): ReactElement => {
  const connection = useRoomConnection(roomId);
  const screen = roomScreenFor(connection, new Date());

  switch (screen.kind) {
    case 'connecting':
      return <Connecting />;
    case 'unavailable':
      return <RoomUnavailableNotice reason={screen.reason} />;
    case 'join':
      return <RoomJoin roomId={roomId} playerId={screen.playerId} />;
    case 'lobby':
      return <RoomLobby roomId={roomId} room={screen.room} viewerId={screen.viewerId} />;
    case 'playing':
      return <RoomGame roomId={roomId} room={screen.room} viewerId={screen.viewerId} />;
    case 'finished':
      return <RoomFinished room={screen.room} viewerId={screen.viewerId} />;
    case 'closed-early':
      return <RoomClosedEarly room={screen.room} viewerId={screen.viewerId} />;
  }
};

/**
 * The room screen — everything an invite link leads to.
 *
 * A visitor is signed in anonymously before the room is even read, because the
 * security rules require it for reads too; only then are they asked for a
 * nickname. From there the screen follows the room live, so players see each
 * other arrive.
 *
 * @example
 * <Route path={ROOM_ROUTE_PATTERN} element={<RoomPage />} />
 */
export const RoomPage = () => {
  const { roomId } = useParams();

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Game room
      </Typography>

      {roomId === undefined ? <RoomUnavailableNotice reason="missing" /> : <Room roomId={roomId} />}
    </Container>
  );
};
