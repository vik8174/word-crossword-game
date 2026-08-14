import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

/**
 * Placeholder landing page.
 *
 * Real room-creation / join flows are added by later issues (see PRD —
 * GitHub issue #1). This page only proves the app shell (router + MUI
 * theme) renders correctly.
 */
export const HomePage = () => {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Word Crossword Game
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Cooperative word-crossword game for practicing spoken English.
      </Typography>
    </Container>
  );
};
