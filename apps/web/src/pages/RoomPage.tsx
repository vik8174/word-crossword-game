import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useParams } from 'react-router-dom';

import { RoomClosedEarly } from '../components/RoomClosedEarly';
import { RoomFinished } from '../components/RoomFinished';
import { RoomGame } from '../components/RoomGame';
import { RoomInvitePanel } from '../components/RoomInvitePanel';
import { RoomJoin } from '../components/RoomJoin';
import { RoomLobby } from '../components/RoomLobby';
import { RoomUnavailableNotice } from '../components/RoomUnavailableNotice';
import { isOpenToNewPlayers, type RoomScreen, roomScreenFor } from '../rooms/room-screen';
import { usePresenceHeartbeat } from '../rooms/use-presence-heartbeat';
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
const RoomScreenView = ({
  roomId,
  screen,
}: {
  readonly roomId: string;
  readonly screen: RoomScreen;
}): ReactElement => {
  switch (screen.kind) {
    case 'connecting':
      return <Connecting />;
    case 'unavailable':
      return <RoomUnavailableNotice reason={screen.reason} />;
    case 'join':
      return (
        <RoomJoin roomId={roomId} playerId={screen.playerId} seatToRelease={screen.seatToRelease} />
      );
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
 * The room behind the link: the invitation, and whatever the room is doing.
 *
 * The invite link sits above the screen switch rather than inside the lobby,
 * because it is built from the address and nothing else — a player who has just
 * arrived can pass it on while the first snapshot is still on its way. It goes
 * once the room stops taking anybody: sharing a link into a game already under
 * way only sends a friend to a refusal.
 *
 * The mark this client writes for itself sits here too, above the switch, for
 * the same kind of reason: being in a room is not a phase of one. A lobby and a
 * game are two screens, and a player is equally present in both — so the
 * heartbeat is started once, from the connection, and neither screen has to
 * remember to keep it going (issue #47).
 */
const Room = ({ roomId }: { readonly roomId: string }): ReactElement => {
  const connection = useRoomConnection(roomId);
  const screen = roomScreenFor(connection, new Date());

  usePresenceHeartbeat(roomId, connection);

  return (
    <Stack spacing={3}>
      {isOpenToNewPlayers(screen) && (
        <RoomInvitePanel roomId={roomId} origin={window.location.origin} />
      )}

      <RoomScreenView roomId={roomId} screen={screen} />
    </Stack>
  );
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
