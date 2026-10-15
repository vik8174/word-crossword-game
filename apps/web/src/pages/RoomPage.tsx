import GlobalStyles from '@mui/material/GlobalStyles';
import { type ReactElement, type ReactNode, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { ConnectingStreet, DoorColumn } from '../components/DoorColumn';
import { RoomClosedEarly } from '../components/RoomClosedEarly';
import { RoomFinished } from '../components/RoomFinished';
import { RoomGame } from '../components/RoomGame';
import { RoomInvitePanel } from '../components/RoomInvitePanel';
import { RoomJoin } from '../components/RoomJoin';
import { RoomLobby } from '../components/RoomLobby';
import { RoomUnavailableNotice } from '../components/RoomUnavailableNotice';
import { ScreenEnter } from '../components/ScreenEnter';
import { WaitingMark } from '../components/WaitingMark';
import { MOTION_PLAY_CSS } from '../motion-play-styles';
import type { RoomDocument } from '../rooms/room-document';
import {
  hasSomebodyToInvite,
  type RoomScreen,
  roomScreenFor,
  screenAfterRefusedJoin,
} from '../rooms/room-screen';
import { usePresenceHeartbeat } from '../rooms/use-presence-heartbeat';
import { useRoomConnection } from '../rooms/use-room-connection';
import { funnelScreenFor } from '../telemetry/funnel';
import { useScreenReached } from '../telemetry/use-screen-reached';

/** What the page is, said once for every phase of a room that shows no heading of its own. */
const ROOM_HEADING = 'Game room';

/**
 * The street, the line and the beating dot of `connecting`: a visitor waiting to
 * learn whether a room will let them in, with no room to frame yet.
 *
 * Draws no room shape at all, because there isn't one yet. Earlier both this and
 * `unavailable` stood inside the same frame every real screen of a room draws,
 * so a guest opening an invite link cold saw that frame appear the moment the
 * visit began, then disappear and reappear a second later (issue #132).
 *
 * Built to `?state=connecting` (template lines 893-899): the line being thrown
 * across the street to an empty balcony, then the dot and "Connecting to the
 * game…" centred under it. Named the same page a real room screen is, unseen
 * for the same reason `RoomShell` says it unseen on the screen a game is played
 * on, so a reader moving by headings finds one even for a wait that
 * `unavailable` can leave them sitting through.
 */
const Connecting = () => (
  <DoorColumn unseenHeading={ROOM_HEADING} picture={<ConnectingStreet />}>
    <WaitingMark>Connecting to the game…</WaitingMark>
  </DoorColumn>
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
      return <Connecting />;
    case 'unavailable':
      return <RoomUnavailableNotice reason={screen.reason} />;
    case 'join':
      return (
        <RoomJoin
          roomId={roomId}
          ownerNickname={screen.ownerNickname}
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
 * this component rendering (see {@link ScreenEnter}). The heartbeat above
 * causes a render every fifteen seconds in every client, so the difference
 * between the two is a screen that opens when a player pressed something and
 * one that twitches all game.
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

  // The screen this one replaced, kept so the fiesta can tell the change from
  // `playing` to `finished` seen in this session from a finished room that was
  // opened as it is. Set while rendering, not in an effect, so the first render
  // of the new screen already knows where it came from.
  const [screens, setScreens] = useState<{ current: string; previous: string | null }>({
    current: screen.kind,
    previous: null,
  });

  if (screens.current !== screen.kind) {
    setScreens({ current: screen.kind, previous: screens.current });
  }

  const arrivesFromPlay = screen.kind === 'finished' && screens.previous === 'playing';

  return (
    <>
      <GlobalStyles styles={MOTION_PLAY_CSS} />
      <ScreenEnter key={screen.kind} arrivesFromPlay={arrivesFromPlay}>
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
      </ScreenEnter>
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
 * The page itself is nothing but the address: every screen that has a room to
 * show draws the same frame (see `RoomShell`), and the two that do not —
 * waiting for word of one, or being told there is none — draw none of it
 * either (see {@link Connecting} and `RoomUnavailableNotice`). It used to be a `Container maxWidth="sm"`,
 * which gave the board 552 pixels however wide the window was, and the blocks
 * stacked above and below it took the rest out of the size of a square
 * (issue #101).
 *
 * @example
 * <Route path={ROOM_ROUTE_PATTERN} element={<RoomPage />} />
 */
export const RoomPage = () => {
  const { roomId } = useParams();

  if (roomId === undefined) {
    return <RoomUnavailableNotice reason="missing" />;
  }

  return <Room roomId={roomId} />;
};
