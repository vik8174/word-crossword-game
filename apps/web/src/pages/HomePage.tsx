import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { packageName } from 'shared';

/**
 * Placeholder landing page.
 *
 * Real room-creation / join flows are added by later issues (see PRD —
 * GitHub issue #1). This page only proves the app shell (router + MUI
 * theme) renders correctly, and that `apps/web` can import from the
 * `packages/shared` workspace package (module resolution, TS types, and
 * build all work across the package boundary) — see
 * `docs/decisions/0006-pnpm-workspaces-without-orchestrator.md`. The real
 * game-logic modules (`crossword-generator`, `word-assignment`, etc.) will
 * replace this placeholder import in later issues.
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
      <Typography variant="caption" color="text.disabled" component="p" sx={{ mt: 4 }}>
        Powered by the `{packageName}` workspace package.
      </Typography>
    </Container>
  );
};
