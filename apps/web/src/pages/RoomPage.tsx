import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { type ReactElement, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { RoomClosedEarly } from '../components/RoomClosedEarly';
import { RoomFinished } from '../components/RoomFinished';
import { RoomGame } from '../components/RoomGame';
import { RoomInvitePanel } from '../components/RoomInvitePanel';
import { RoomJoin } from '../components/RoomJoin';
import { RoomLobby } from '../components/RoomLobby';
import { RoomUnavailableNotice } from '../components/RoomUnavailableNotice';
import type { RoomDocument } from '../rooms/room-document';
import {
  isOpenToNewPlayers,
  type RoomScreen,
  roomScreenFor,
  screenAfterRefusedJoin,
} from '../rooms/room-screen';
import { usePresenceHeartbeat } from '../rooms/use-presence-heartbeat';
import { useRoomConnection } from '../rooms/use-room-connection';
import { funnelScreenFor } from '../telemetry/funnel';
import { useScreenReached } from '../telemetry/use-screen-reached';

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
  onJoinRefused,
}: {
  readonly roomId: string;
  readonly screen: RoomScreen;
  readonly onJoinRefused: () => void;
}): ReactElement => {
  switch (screen.kind) {
    case 'connecting':
      return <Connecting />;
    case 'unavailable':
      return <RoomUnavailableNotice reason={screen.reason} />;
    case 'join':
      return (
        <RoomJoin
          roomId={roomId}
          playerId={screen.playerId}
          seatToRelease={screen.seatToRelease}
          onRefused={onJoinRefused}
        />
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
 *
 * Two of the screens below are the last two of the funnel, and they report
 * being reached from here rather than from themselves: they are one address
 * apart from nothing, so what tells them apart is which one this switch is
 * showing (issue #51). Only the kind is handed over, never the screen — the
 * screen is rebuilt on every snapshot, and the heartbeat above causes one every
 * fifteen seconds.
 *
 * One thing here is not read from the room: whether the room refused to take
 * this visitor in. It cannot be — a refused write is answered with
 * `permission-denied` and the document that would explain it is the very thing
 * the visitor is waiting for. So it is held here for exactly as long as that
 * wait lasts, and the notice it puts up gives way to the room's own the moment
 * a snapshot lands (issue #50).
 */
const Room = ({ roomId }: { readonly roomId: string }): ReactElement => {
  const connection = useRoomConnection(roomId);
  const [refusedRoom, setRefusedRoom] = useState<RoomDocument | null>(null);
  const room = connection.status === 'ready' ? connection.room : null;

  // The room as it stands, kept where the refusal can reach it. A refusal comes
  // back after its write, by which time any snapshot may have landed — another
  // player's presence mark among them — and one recorded against the document
  // the button was pressed from would then match nothing, leaving the form
  // frozen mid-submit with nothing said. It is recorded against the room the
  // refusal arrives at instead, which is the room it is news about.
  const latestRoom = useRef(room);

  useEffect(() => {
    latestRoom.current = room;
  });

  // Remembered as a room and not as a flag: every snapshot is parsed into a
  // document of its own, so the moment a newer one arrives this stops matching
  // and the screen goes back to being what the document says. A flag would have
  // to be cleared by hand, and a visitor whose seat freed up again would sit
  // behind a stale notice.
  const screen = screenAfterRefusedJoin(
    roomScreenFor(connection, new Date()),
    room !== null && room === refusedRoom,
  );

  usePresenceHeartbeat(roomId, connection);
  useScreenReached(funnelScreenFor(screen.kind));

  return (
    <Stack spacing={3}>
      {isOpenToNewPlayers(screen) && (
        <RoomInvitePanel roomId={roomId} origin={window.location.origin} />
      )}

      <RoomScreenView
        roomId={roomId}
        screen={screen}
        onJoinRefused={() => setRefusedRoom(latestRoom.current)}
      />
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
