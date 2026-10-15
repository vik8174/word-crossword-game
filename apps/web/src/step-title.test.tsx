import { ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { JoinRoomForm } from './components/JoinRoomForm';
import { RoomShell } from './components/RoomShell';
import { stepTitleSx } from './components/surface-styles';
import { CreateRoomPage } from './pages/CreateRoomPage';
import { theme } from './theme';

// `CreateRoomPage` reaches for Firebase as it is imported; mocked so the page
// can be rendered as it stands, and nothing it does here ever calls them.
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ name: 'auth' })),
  signInAnonymously: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ name: 'firestore' })),
  collection: vi.fn(() => ({ path: 'rooms' })),
  addDoc: vi.fn(),
  deleteField: vi.fn(() => ({ field: 'deleted' })),
}));
vi.mock('firebase/analytics', () => ({
  initializeAnalytics: vi.fn(() => ({ app: 'fake-analytics' })),
  isSupported: vi.fn(() => Promise.resolve(true)),
  logEvent: vi.fn(),
  setDefaultEventParameters: vi.fn(),
}));

/**
 * The name of a step is one drawing shared by `/create` inside its panel and
 * join at the top of its column (`design/templates/state-tree.html`'s
 * `.step-title`, line 112): sentence case
 * as written, 700 at 34px, a line height of 1.1, no capitals and no tracking,
 * and in ink with no shadow under the letters now the garden is gone (#222).
 *
 * It is guarded where it is drawn, at its sites, and not in a test that
 * builds its own heading: putting the sign variant back at either site, or a
 * shadow, a capital or a tracking back on it, left every test passing once
 * (#244, round 1).
 */
const INK = 'rgb(27, 45, 56)';

/** What each site's `h1` is set in, read the way a browser resolves it. */
const expectAStepTitle = (heading: HTMLElement, margin = '0px 0px 6px') => {
  const style = getComputedStyle(heading);

  expect(style.fontSize).toBe('34px');
  expect(style.fontWeight).toBe('700');
  expect(style.lineHeight).toBe('1.1');
  expect(style.fontFamily).toContain('Alegreya Sans');
  expect(style.textTransform).not.toBe('uppercase');
  expect(['normal', '0px', '']).toContain(style.letterSpacing);
  expect(style.color).toBe(INK);
  // A shadow has an offset in it; the absence of one computes to `none`, to
  // nothing, or to a transparent black, depending on the engine.
  expect(style.textShadow).not.toMatch(/\d(px|em)/);
  expect(style.margin).toBe(margin);
};

describe('the name of a step', () => {
  it('is not drawn where the room frame puts it: the room keeps its name for a reader and shows none', () => {
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <RoomShell title="Lobby">
            <p>What is there</p>
          </RoomShell>
        </MemoryRouter>
      </ThemeProvider>,
    );

    // The status and the action of a room are the frame's header
    // (`useFrameSlot`), and a screen in a room is named by its letters and its
    // drawing rather than by a title (`state-tree.html`'s `playing`, `lobby` and
    // `finished` carry none), so the room's `h1` is read aloud and not shown.
    const heading = screen.getByRole('heading', { level: 1, name: 'Lobby' });
    const style = getComputedStyle(heading);

    expect(heading.tagName).toBe('H1');
    expect(style.position).toBe('absolute');
    expect(style.width).toBe('1px');
    expect(style.height).toBe('1px');
  });

  it('is set as the template draws it where /create puts it', () => {
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/create']}>
          <Routes>
            <Route path="/create" element={<CreateRoomPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    );

    const heading = screen.getByRole('heading', { level: 1, name: 'New game' });

    // The column's own 18px gap sets it apart from what follows (issue #225).
    expectAStepTitle(heading, '0px');
    expect(heading.tagName).toBe('H1');
  });

  it('is set as the template draws it where the door into a room puts it', () => {
    render(
      <ThemeProvider theme={theme}>
        <JoinRoomForm ownerNickname="Vik" onJoin={() => undefined} isJoining={false} />
      </ThemeProvider>,
    );

    const heading = screen.getByRole('heading', { level: 1, name: 'Join the game' });

    expectAStepTitle(heading, '0px');
    expect(heading.tagName).toBe('H1');
  });

  it('is set by the same recipe at both sites, which draws no rule and no shadow', () => {
    const title = stepTitleSx();

    expect(title.color).toBe(theme.palette.street.ink);
    expect(title.margin).toBe('0 0 0.375rem');
    expect(title).not.toHaveProperty('textShadow');
    expect(title).not.toHaveProperty('&::after');
  });
});
