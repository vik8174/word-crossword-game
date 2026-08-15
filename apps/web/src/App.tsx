import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { CreateRoomPage } from './pages/CreateRoomPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RoomPage } from './pages/RoomPage';
import { ROOM_ROUTE_PATTERN } from './rooms/room-link';
import { theme } from './theme';

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
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreateRoomPage />} />
          <Route path={ROOM_ROUTE_PATTERN} element={<RoomPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};
