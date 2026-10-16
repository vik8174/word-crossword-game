import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';
import { ThemeProvider } from '@mui/material/styles';
import { Suspense } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Frame } from './components/Frame';
import { FrameSlotProvider } from './components/FrameSlotProvider';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PageLoading } from './pages/PageLoading';
import { ROOM_ROUTE_PATTERN } from './rooms/room-link';
import { lazyRoute } from './routing/chunk-load';
import { CrashProbe } from './routing/CrashProbe';
import { routePatternOf } from './routing/route-pattern';
import { usePageView } from './telemetry/use-page-view';
import { MOTION_CSS } from './motion-styles';
import { theme } from './theme';

/**
 * The two routes that open a room, fetched only once one is asked for.
 *
 * They are the reason the first screen used to be so expensive: between them
 * they pull in Firestore, Anonymous Auth and the crossword generator, none of
 * which the landing page has any use for (issue #92). The landing page and the
 * catch-all stay in the first chunk — they are a heading and a button each, and
 * the catch-all is what an address nobody planned for falls back to.
 *
 * `lazyRoute`, not `lazy`: a chunk that cannot be fetched (a deploy took it
 * away from a tab that still wants it) is then a `ChunkLoadError`, which the
 * boundary in `RoutedPages` answers instead of leaving a white page (issue #294).
 */
const CreateRoomPage = lazyRoute(() =>
  import('./pages/CreateRoomPage').then((module) => ({ default: module.CreateRoomPage })),
);
const RoomPage = lazyRoute(() =>
  import('./pages/RoomPage').then((module) => ({ default: module.RoomPage })),
);

/** The landing page's own address. */
const GATE_PATH = '/';

/**
 * The routes, and the reporting of which of them is open.
 *
 * A component of its own because `usePageView` reads the current route, which
 * only something inside the router can do.
 *
 * Every route stands on the same ground, `duck`, which `CssBaseline` paints on
 * the body from the theme. Nothing wraps the routes: the garden that used to
 * (a picture, weather and a veil) went in issue #222, and with it the hand-off
 * where each page claimed the picture it stood in front of. The frame is not
 * in here either: it is mounted beside this, once, so it is on screen while a
 * page is fetched and does not move with the routes (issue #245).
 *
 * The error boundary stands around the routes and under the frame, so a screen
 * that cannot be fetched or breaks while it draws ends on a page of its own
 * with the frame still above it, instead of a white one (issue #294).
 */
const RoutedPages = () => {
  usePageView();
  const { pathname } = useLocation();

  return (
    <RouteErrorBoundary
      route={routePatternOf(pathname)}
      release={import.meta.env.VITE_SENTRY_RELEASE}
    >
      <Suspense fallback={<PageLoading />}>
        <CrashProbe />
        <Routes>
          <Route path={GATE_PATH} element={<HomePage />} />
          <Route path="/create" element={<CreateRoomPage />} />
          <Route path={ROOM_ROUTE_PATTERN} element={<RoomPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
};

/**
 * App root — wires up the MUI theme, client-side routing and the frame: the
 * header with the name that is across the top of every route (issue #245).
 *
 * `/room/:roomId` is the address invite links point at, and the catch-all
 * behind it is not decoration: links travel through chats that truncate them,
 * and an unmatched route renders nothing at all.
 */
export const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* The street's movement, every rule inside `no-preference` (`motion-styles.ts`). */}
      <GlobalStyles styles={MOTION_CSS} />
      <BrowserRouter>
        <FrameSlotProvider>
          <Frame />
          <RoutedPages />
        </FrameSlotProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};
