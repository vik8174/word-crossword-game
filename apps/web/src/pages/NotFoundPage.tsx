import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

/**
 * Catch-all for addresses the app knows nothing about.
 *
 * Invite links are copied and pasted between chats, where they get truncated
 * and mangled; without this route such a link renders an entirely blank page
 * and the player has no idea whether the game or their browser is broken.
 *
 * @example
 * <Route path="*" element={<NotFoundPage />} />
 */
export const NotFoundPage = () => {
  return (
    <Container maxWidth="sm" sx={{ py: 7 }}>
      <Typography variant="h1" component="h1" sx={{ mb: 2 }}>
        This page does not exist
      </Typography>
      <Typography variant="body1" color="text.secondary">
        The link may be incomplete or mistyped. If you were invited to a game, ask for the link
        again — it looks like <code>/room/…</code>.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained" sx={{ mt: 6 }}>
        Go to the start
      </Button>
    </Container>
  );
};
