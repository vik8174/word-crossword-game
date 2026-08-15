import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { JoinRoomForm } from '../components/JoinRoomForm';
import { RoomBoard } from '../components/RoomBoard';
import { RoomUnavailableNotice } from '../components/RoomUnavailableNotice';
import { normalizeNickname } from '../rooms/nickname';
import { roomAccessFor } from '../rooms/room-access';
import type { RoomDocument } from '../rooms/room-document';
import { joinRoom, startGame } from '../rooms/room-service';
import { useRoomConnection } from '../rooms/use-room-connection';

const JOIN_FAILED_MESSAGE =
  'Could not join the game. Check your connection and try again — the room is still there.';

const START_FAILED_MESSAGE =
  'Could not start the game. Check your connection and try again — nothing has been dealt out yet.';

/**
 * How far something the player asked for got. Both entering a room and starting
 * a game stay `submitting` after they succeed: the write comes back through the
 * subscription and replaces the screen, so clearing it here would only flicker.
 */
type ActionPhase =
  | { readonly phase: 'idle' }
  | { readonly phase: 'submitting' }
  | { readonly phase: 'failed'; readonly message: string };

const Room = ({ roomId }: { readonly roomId: string }) => {
  const connection = useRoomConnection(roomId);
  const [join, setJoin] = useState<ActionPhase>({ phase: 'idle' });
  const [start, setStart] = useState<ActionPhase>({ phase: 'idle' });

  const submitJoin = async (playerId: string, rawNickname: string) => {
    setJoin({ phase: 'submitting' });

    try {
      await joinRoom({ roomId, playerId, nickname: normalizeNickname(rawNickname) });
    } catch (error) {
      // "Missing or insufficient permissions" says nothing to a player, so they
      // get a plain message and the details go to the console.
      console.error('Joining the room failed', error);
      setJoin({ phase: 'failed', message: JOIN_FAILED_MESSAGE });
    }
  };

  const submitStart = async (room: RoomDocument) => {
    setStart({ phase: 'submitting' });

    try {
      await startGame({ roomId, room });
    } catch (error) {
      console.error('Starting the game failed', error);
      setStart({ phase: 'failed', message: START_FAILED_MESSAGE });
    }
  };

  if (connection.status === 'connecting') {
    return (
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <CircularProgress size={24} />
        <Typography variant="body1" role="status">
          Connecting to the game...
        </Typography>
      </Stack>
    );
  }

  if (connection.status === 'failed') {
    return <RoomUnavailableNotice reason="connection" />;
  }

  if (connection.status === 'missing') {
    return <RoomUnavailableNotice reason="missing" />;
  }

  const { room, playerId } = connection;
  // Judged on every render, and a render follows every snapshot — good enough
  // for a room whose lifetime is measured in hours. Keeping a room alive while
  // it is being played is issue #9.
  const access = roomAccessFor(room, playerId, new Date());

  if (access === 'expired') {
    return <RoomUnavailableNotice reason="expired" />;
  }

  if (access === 'full') {
    return <RoomUnavailableNotice reason="full" />;
  }

  if (access === 'joined') {
    return (
      <RoomBoard
        room={room}
        viewerId={playerId}
        onStartGame={() => void submitStart(room)}
        isStartingGame={start.phase === 'submitting'}
        startGameError={start.phase === 'failed' ? start.message : undefined}
      />
    );
  }

  return (
    <JoinRoomForm
      onJoin={(nickname) => void submitJoin(playerId, nickname)}
      isJoining={join.phase === 'submitting'}
      errorMessage={join.phase === 'failed' ? join.message : undefined}
    />
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
