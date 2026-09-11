import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { roomPath } from './rooms/room-link';

// The room route reaches for Firebase as soon as it renders; mocked so routing
// can be exercised without a project behind it.
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ name: 'auth' })),
  signInAnonymously: vi.fn(() => new Promise(() => {})),
}));
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ name: 'firestore' })),
  collection: vi.fn(),
  addDoc: vi.fn(),
  doc: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
  updateDoc: vi.fn(),
  // The SDK's word for "this field goes", which taking a seat writes.
  deleteField: vi.fn(() => ({ field: 'deleted' })),
}));

const open = (path: string) => {
  window.history.pushState({}, '', path);

  return render(<App />);
};

afterEach(() => {
  window.history.pushState({}, '', '/');
});

describe('App', () => {
  it('renders the home route by default, standing on its own picture rather than the garden', () => {
    const { container } = render(<App />);

    expect(screen.getByRole('heading', { name: /word crossword game/i })).toBeInTheDocument();

    // The boundary issue #151 draws: the gate creates no canvas at all, unlike
    // every other route, which the garden still draws its falling petals on
    // one — asserted below on `/room` and the catch-all.
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('opens a room at the address invite links point at, inside the garden', async () => {
    const { container } = open(roomPath('room-1'));

    // Fetched when the address asks for it rather than shipped with the landing
    // page (issue #92), so the room arrives a tick after the render. Signing in
    // never resolves in this test, so the room stays on `connecting` — which is
    // exactly the screen this asserts, since it has no frame of its own to find
    // instead (issue #132).
    expect(await screen.findByText(/connecting to the game/i)).toBeInTheDocument();

    // `connecting` stands in front of the doors picture (`sceneFor` in
    // `garden/use-room-garden.ts`), and the garden's falling petals still run
    // behind it on a canvas of their own — only `/` leaves the garden entirely.
    expect(container.querySelectorAll('canvas').length).toBeGreaterThan(0);
  });

  it('shows that something is coming while the room is on its way', async () => {
    // A fresh copy of the app, because `lazy` remembers what it has already
    // loaded: rendered a second time it resolves at once and there is no
    // loading state left to look at, whatever order the tests run in.
    vi.resetModules();
    const { App: FreshApp } = await import('./App');

    window.history.pushState({}, '', roomPath('room-1'));
    render(<FreshApp />);

    // What the split must not do is leave the page blank in the meantime: an
    // app that is working would look like one that is broken, and this is what
    // the shift between screens is drawn over (issue #93).
    expect(screen.getByRole('progressbar', { name: /loading/i })).toBeInTheDocument();
    expect(await screen.findByText(/connecting to the game/i)).toBeInTheDocument();
  });

  it('explains an address it knows nothing about instead of showing a blank page', () => {
    open('/room');

    expect(screen.getByRole('heading', { name: /does not exist/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to the start/i })).toHaveAttribute('href', '/');
  });

  it('mounts the garden on leaving the gate and unmounts it on returning, in one session', async () => {
    // The boundary in App.tsx is not just which route renders which page — it
    // is <Garden> itself being mounted only for the eight screens that share
    // it, decided fresh on every navigation rather than once for the tab's
    // life. Every other case in this file renders each address on its own, so
    // none of them exercises an actual client-side navigation across that
    // boundary within one mounted app.
    const { container } = render(<App />);

    expect(container.querySelector('canvas')).toBeNull();

    fireEvent.click(screen.getByRole('link', { name: /create a game/i }));

    // CreateRoomPage reaches for Firestore/Auth as soon as it mounts, which is
    // why it is loaded on demand — `findByRole` waits out that tick.
    expect(await screen.findByRole('button', { name: /create room/i })).toBeInTheDocument();
    expect(container.querySelectorAll('canvas').length).toBeGreaterThan(0);

    // Back to the gate, the way a browser's own back button does it — a real
    // `popstate`, not a second `render()` of a fresh app.
    window.history.back();

    expect(
      await screen.findByRole('heading', { name: /word crossword game/i }),
    ).toBeInTheDocument();
    expect(container.querySelector('canvas')).toBeNull();
  });
});
