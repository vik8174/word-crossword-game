import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

/**
 * Landing page — the way into a new game.
 *
 * Joining an existing game does not start here: players arrive straight at
 * their room link (issue #5), so the only action this page offers is creating
 * one.
 */
export const HomePage = () => {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Word Crossword Game
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Cooperative word-crossword game for practicing spoken English.
      </Typography>
      <Button component={RouterLink} to="/create" variant="contained" size="large" sx={{ mt: 4 }}>
        Create a game
      </Button>
    </Container>
  );
};
