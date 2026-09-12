import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Garden } from './garden/Garden';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PageLoading } from './pages/PageLoading';
import { ROOM_ROUTE_PATTERN } from './rooms/room-link';
import { usePageView } from './telemetry/use-page-view';
import { theme } from './theme';

/**
 * The two routes that open a room, fetched only once one is asked for.
 *
 * They are the reason the first screen used to be so expensive: between them
 * they pull in Firestore, Anonymous Auth and the crossword generator, none of
 * which the landing page has any use for (issue #92). The landing page and the
 * catch-all stay in the first chunk — they are a heading and a button each, and
 * the catch-all is what an address nobody planned for falls back to.
 */
const CreateRoomPage = lazy(() =>
  import('./pages/CreateRoomPage').then((module) => ({ default: module.CreateRoomPage })),
);
const RoomPage = lazy(() =>
  import('./pages/RoomPage').then((module) => ({ default: module.RoomPage })),
);

/** The one address whose picture carries no weather over it. */
const GATE_PATH = '/';

/**
 * The routes, and the reporting of which of them is open.
 *
 * A component of its own because `usePageView` and `useLocation` both read the
 * current route, which only something inside the router can do.
 *
 * The garden wraps every route, `/` included — the picture and the veil stand
 * behind the landing page exactly as they do everywhere else, so a change of
 * scene crossfades across it the same way it does between any other two
 * screens, and the ~300ms gap a lazy chunk used to load behind is gone with it
 * (issue #166). It used to leave `/` outside entirely (issue #151): that
 * boundary was drawn to keep the garden's canvas — a `requestAnimationFrame`
 * loop and falling petals — off a route that never painted on it, which is
 * still true and still the point, but the picture underneath that canvas
 * turned out to cost nothing extra to show there too. `Garden` is a static
 * import, so `apps/web/build/first-visit-weight.ts` was already counting the
 * whole garden — picture, petals and all — on every first visit before this
 * ticket, `/` included; what stood outside `/` was the code actually
 * *running* there, not the bytes. So the boundary moved down by one layer
 * rather than closing altogether: `Garden` mounts everywhere now, but its
 * `petals` prop is `false` for `/`, which is what keeps the canvas and the
 * weather off it. `HomePage` claims the `gate` scene on mount, the same way
 * `CreateRoomPage` claims its own.
 */
const RoutedPages = () => {
  usePageView();

  const { pathname } = useLocation();

  const routes = (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path={GATE_PATH} element={<HomePage />} />
        <Route path="/create" element={<CreateRoomPage />} />
        <Route path={ROOM_ROUTE_PATTERN} element={<RoomPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );

  return <Garden petals={pathname !== GATE_PATH}>{routes}</Garden>;
};

/**
 * App root — wires up the MUI theme and client-side routing.
 *
 * `/room/:roomId` is the address invite links point at, and the catch-all
 * behind it is not decoration: links travel through chats that truncate them,
 * and an unmatched route renders nothing at all.
 */
export const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <RoutedPages />
      </BrowserRouter>
    </ThemeProvider>
  );
};
