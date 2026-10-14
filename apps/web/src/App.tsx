import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
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
 * where each page claimed the picture it stood in front of.
 */
const RoutedPages = () => {
  usePageView();

  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path={GATE_PATH} element={<HomePage />} />
        <Route path="/create" element={<CreateRoomPage />} />
        <Route path={ROOM_ROUTE_PATTERN} element={<RoomPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
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
