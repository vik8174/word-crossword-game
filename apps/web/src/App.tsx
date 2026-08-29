import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
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

/**
 * The routes, and the reporting of which of them is open.
 *
 * A component of its own because `usePageView` reads the current route, which
 * only something inside the router can do.
 */
const RoutedPages = () => {
  usePageView();

  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreateRoomPage />} />
        <Route path={ROOM_ROUTE_PATTERN} element={<RoomPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

/**
 * App root — wires up the MUI theme, the garden behind it and client-side
 * routing.
 *
 * `/room/:roomId` is the address invite links point at, and the catch-all
 * behind it is not decoration: links travel through chats that truncate them,
 * and an unmatched route renders nothing at all.
 *
 * The garden is outside the router rather than on any page, because it is one
 * background for the life of the tab: petals that started again at every
 * address would say a page had reloaded when none had. Which screens they fall
 * behind is the room's to answer (see {@link useRoomGarden}), and the answer is
 * every screen but the one a game is played on
 * (`docs/decisions/0030-where-movement-is-allowed.md`).
 */
export const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Garden>
        <BrowserRouter>
          <RoutedPages />
        </BrowserRouter>
      </Garden>
    </ThemeProvider>
  );
};
