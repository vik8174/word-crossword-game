import { createTheme } from '@mui/material/styles';

/**
 * Base MUI theme for the app.
 *
 * Kept minimal for now — palette/typography will evolve as real screens
 * are built in later issues.
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1565c0',
    },
    secondary: {
      main: '#ef6c00',
    },
  },
});
