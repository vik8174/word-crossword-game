import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { type ReactElement, type ReactNode, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { RoomClosedEarly } from '../components/RoomClosedEarly';
import { RoomFinished } from '../components/RoomFinished';
import { RoomGame } from '../components/RoomGame';
import { RoomInvitePanel } from '../components/RoomInvitePanel';
import { RoomJoin } from '../components/RoomJoin';
import { RoomLobby } from '../components/RoomLobby';
import { RoomMiddleColumn, RoomShell } from '../components/RoomShell';
import { ScreenShift } from '../components/ScreenShift';
import { RoomUnavailableNotice } from '../components/RoomUnavailableNotice';
import { RewardCloth } from '../garden/RewardCloth';
import { useRoomGarden } from '../garden/use-room-garden';
import { playersInJoinOrder } from '../rooms/room-access';
import type { RoomDocument } from '../rooms/room-document';
import { finishedGameSummary } from '../rooms/game-summary';
import {
  hasSomebodyToInvite,
  type RoomScreen,
  roomScreenFor,
  screenAfterRefusedJoin,
} from '../rooms/room-screen';
import { usePresenceHeartbeat } from '../rooms/use-presence-heartbeat';
import { useRoomConnection } from '../rooms/use-room-connection';
import { finishedWordsOf } from '../rooms/word-visibility';
import { funnelScreenFor } from '../telemetry/funnel';
import { useScreenReached } from '../telemetry/use-screen-reached';

/** Shown while the visitor is being signed in and the first snapshot is on its way. */
const Connecting = () => (
  <Stack direction="row" spacing={4} sx={{ alignItems: 'center' }}>
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
  invitation,
  onJoinRefused,
}: {
  readonly roomId: string;
  readonly screen: RoomScreen;
  readonly invitation?: ReactNode;
  readonly onJoinRefused: () => void;
}): ReactElement => {
  switch (screen.kind) {
    case 'connecting':
      return (
        <RoomShell>
          <RoomMiddleColumn>
            <Connecting />
          </RoomMiddleColumn>
        </RoomShell>
      );
    case 'unavailable':
      return (
        <RoomShell>
          <RoomMiddleColumn>
            <RoomUnavailableNotice reason={screen.reason} />
          </RoomMiddleColumn>
        </RoomShell>
      );
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
      return (
        <RoomLobby
          roomId={roomId}
          room={screen.room}
          viewerId={screen.viewerId}
          invitation={invitation}
        />
      );
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
 * The invite link is decided above the screen switch and drawn below it,
 * because those are two different questions. Who is shown it, and for how long,
 * is `hasSomebodyToInvite`'s answer and not any screen's: the host, for as long
 * as there is a seat left to invite anybody into
 * (`docs/decisions/0026-the-invite-link-belongs-to-the-host.md`). A seat freed
 * by a mark that went stale brings it back on the next snapshot, which the
 * host's own heartbeat below produces every fifteen seconds. Where it is put is
 * the lobby's, because the lobby is the only screen that answer can be true on,
 * and because a room laid out as three zones finally has a place for it
 * (issue #101).
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
 * The change from one of those screens to the next is the one thing on this
 * page that moves, and it is keyed on which screen is showing rather than on
 * this component rendering (see {@link ScreenShift}). The heartbeat above
 * causes a render every fifteen seconds in every client, so the difference
 * between the two is a shift that plays when a player pressed something and one
 * that twitches all game.
 *
 * The garden behind the page is told the same thing, from here rather than from
 * the screens, and for the same reason twice over: it is a change and not a
 * render that matters, and while a shift is running two screens are on the page
 * at once — a game and the finished game replacing it would each be answering
 * for the background, and the one on its way out would answer last
 * (see {@link useRoomGarden}).
 *
 * The cloth a finished game is answered with is put up from here for the third
 * time that same reason applies, and for one more of its own. It belongs to the
 * moment the game ended rather than to the finished screen, which is true
 * forever; and it is a reward nobody has yet earned on the landing page, so
 * having it inside this route's own chunk is what keeps a first visit from
 * paying for it (issue #92, `build/first-visit-weight.ts`).
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

  // One moment for the whole render, so the screen and the invitation above it
  // cannot be judged against two different clocks — a seat could be free for
  // one and taken for the other.
  const now = new Date();

  // Remembered as a room and not as a flag: every snapshot is parsed into a
  // document of its own, so the moment a newer one arrives this stops matching
  // and the screen goes back to being what the document says. A flag would have
  // to be cleared by hand, and a visitor whose seat freed up again would sit
  // behind a stale notice.
  const screen = screenAfterRefusedJoin(
    roomScreenFor(connection, now),
    room !== null && room === refusedRoom,
  );

  usePresenceHeartbeat(roomId, connection);
  useScreenReached(funnelScreenFor(screen.kind));

  // The cloth is the whole of what a finished game is answered with, and it
  // belongs to the game having ended rather than to the finished screen — which
  // is true forever, a completed room being terminal (see {@link useRoomGarden},
  // `docs/decisions/0031-one-camera-and-what-it-promises.md`).
  const isUnderTheCloth = useRoomGarden(screen.kind) && screen.kind === 'finished';

  return (
    <>
      {/* Made `inert` under the cloth, exactly as the screen on its way out of a
        shift is. Both are on the page and only one of them is being looked at:
        a board nobody can see is not a board anybody should be able to tab into
        or be read out, and the sentence the cloth carries is the same sentence
        the panel behind it does. */}
      <Box inert={isUnderTheCloth}>
        <ScreenShift shiftKey={screen.kind}>
          <RoomScreenView
            roomId={roomId}
            screen={screen}
            invitation={
              hasSomebodyToInvite(screen, now) ? (
                <RoomInvitePanel roomId={roomId} origin={window.location.origin} />
              ) : undefined
            }
            onJoinRefused={() => setRefusedRoom(latestRoom.current)}
          />
        </ScreenShift>
      </Box>

      {isUnderTheCloth && screen.kind === 'finished' ? (
        <RewardCloth
          summary={finishedGameSummary(
            finishedWordsOf(screen.room).length,
            playersInJoinOrder(screen.room).length,
          )}
        />
      ) : null}
    </>
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
 * The page itself is nothing but the address: every screen of a room draws its
 * own frame, and they all draw the same one (see `RoomShell`). It used to be a
 * `Container maxWidth="sm"`, which gave the board 552 pixels however wide the
 * window was, and the blocks stacked above and below it took the rest out of the
 * size of a square (issue #101).
 *
 * @example
 * <Route path={ROOM_ROUTE_PATTERN} element={<RoomPage />} />
 */
export const RoomPage = () => {
  const { roomId } = useParams();

  if (roomId === undefined) {
    return (
      <RoomShell>
        <RoomMiddleColumn>
          <RoomUnavailableNotice reason="missing" />
        </RoomMiddleColumn>
      </RoomShell>
    );
  }

  return <Room roomId={roomId} />;
};
