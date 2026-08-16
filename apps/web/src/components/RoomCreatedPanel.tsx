import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { roomPath, roomUrl } from '../rooms/room-link';

interface RoomCreatedPanelProps {
  /** Id of the room that was just written to Firestore. */
  readonly roomId: string;
  /** Origin the app is served from; injected so the panel stays testable. */
  readonly origin: string;
}

/** Outcome of the last copy attempt — nothing tried yet, copied, or the browser refused. */
type CopyState = 'idle' | 'copied' | 'failed';

/**
 * Confirms the room exists, hands the owner the link to share, and lets them in.
 *
 * The link is the only way in — the app sends no invitations — so it is shown
 * in full and selectable, not just behind a copy button that a browser may
 * refuse (clipboard access needs permission and is unavailable over plain
 * HTTP).
 *
 * The owner is already a player of the room they created, so entering it is a
 * plain link to its address and not a join of any kind. Nothing sends them
 * there on its own: the point of this screen is the invitation, and the link is
 * usually shared before its owner walks in (issue #27).
 *
 * @param props.roomId - Id returned by `createRoom`
 * @param props.origin - Origin to build the shareable URL from
 */
export const RoomCreatedPanel = ({ roomId, origin }: RoomCreatedPanelProps) => {
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const url = roomUrl(roomId, origin);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState('copied');
    } catch {
      // Clipboard access is denied or missing — the link stays selectable, so
      // the owner is told to copy it by hand rather than left with a dead button.
      setCopyState('failed');
    }
  };

  return (
    <Stack spacing={3}>
      <Alert severity="success">Your room is ready.</Alert>

      <Typography variant="body1">
        Send this link to the other players — they join with a nickname, no sign-up.
      </Typography>

      <TextField
        label="Room link"
        value={url}
        slotProps={{ htmlInput: { readOnly: true } }}
        fullWidth
      />

      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={() => void handleCopy()}>
          Copy link
        </Button>
        {/* A real link, not a button that navigates: it is an address of this
            app, so it opens in a new tab, takes a middle click and shows where
            it goes in the status bar, as anything pointing elsewhere should. */}
        <Button component={RouterLink} to={roomPath(roomId)} variant="outlined">
          Enter the room
        </Button>
      </Stack>

      {copyState === 'copied' && (
        <Typography variant="body2" color="success.main" role="status">
          Link copied
        </Typography>
      )}
      {copyState === 'failed' && (
        <Typography variant="body2" color="error.main" role="status">
          Could not copy automatically — select the link and copy it by hand.
        </Typography>
      )}
    </Stack>
  );
};
