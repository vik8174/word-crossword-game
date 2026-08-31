import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { useScreenReached } from '../telemetry/use-screen-reached';

/**
 * Landing page — the way into a new game.
 *
 * Joining an existing game does not start here: players arrive straight at
 * their room link (issue #5), so the only action this page offers is creating
 * one.
 *
 * It is where the funnel starts, so it says it was reached (issue #51).
 */
export const HomePage = () => {
  useScreenReached('home');

  return (
    <Container maxWidth="sm" sx={{ py: 7 }}>
      {/* The name of the game and the line under it are one thing said twice,
          so they are a step apart; the button is what to do about it, and stands
          off at the widest step there is. */}
      <Typography variant="h1" component="h1" sx={{ mb: 2 }}>
        Word Crossword Game
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Cooperative word-crossword game for practicing spoken English.
      </Typography>
      <Button component={RouterLink} to="/create" variant="contained" size="large" sx={{ mt: 6 }}>
        Create a game
      </Button>
    </Container>
  );
};
