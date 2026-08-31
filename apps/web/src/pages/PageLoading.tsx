import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';

/**
 * What stands in for a page while the page itself is still being fetched.
 *
 * Routes that open a room are loaded on demand (issue #92), so between the
 * click and the screen there is a moment with no page to show. A blank one
 * would be worse than not splitting at all: the app looks broken exactly when
 * it is working, and this is also the backdrop the shift between screens is
 * drawn over (issue #93).
 *
 * It keeps the same `Container` the pages use, so what arrives lands in the
 * place the spinner was rather than jumping. The fade is delayed a little on
 * purpose: a chunk that arrives in under a fifth of a second should not be
 * announced by a spinner that flashes and is gone.
 *
 * @example
 * <Suspense fallback={<PageLoading />}>
 */
export const PageLoading = () => (
  <Container maxWidth="sm" sx={{ py: 7 }}>
    <Stack sx={{ alignItems: 'center' }}>
      <CircularProgress
        aria-label="Loading"
        sx={{
          opacity: 0,
          animation: 'page-loading-fade-in 200ms ease-in 200ms forwards',
          '@keyframes page-loading-fade-in': { to: { opacity: 1 } },
        }}
      />
    </Stack>
  </Container>
);
