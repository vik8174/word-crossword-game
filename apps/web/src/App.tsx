import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { CreateRoomPage } from './pages/CreateRoomPage';
import { HomePage } from './pages/HomePage';
import { theme } from './theme';

/**
 * App root — wires up the MUI theme and client-side routing.
 *
 * The remaining routes (joining a room, the game board) are added by later
 * issues; `/room/:roomId` — the address the invite link points at — is
 * registered by issue #5.
 */
export const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreateRoomPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};
