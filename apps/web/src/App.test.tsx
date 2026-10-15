import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  it('renders the home route by default, called Across the Street', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /across the street/i })).toBeInTheDocument();
  });

  it('opens a room at the address invite links point at', async () => {
    open(roomPath('room-1'));

    // Fetched when the address asks for it rather than shipped with the landing
    // page (issue #92), so the room arrives a tick after the render. Signing in
    // never resolves in this test, so the room stays on `connecting` — which is
    // exactly the screen this asserts, since it has no frame of its own to find
    // instead (issue #132).
    expect(await screen.findByText(/connecting to the game/i)).toBeInTheDocument();
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

  it('draws no canvas and no picture on any route it opens', async () => {
    // The garden that painted both is gone (issue #222): the page is a ground
    // the theme paints, and nothing is drawn over it.
    for (const path of ['/', '/create', roomPath('room-1'), '/room']) {
      const { container, unmount } = open(path);

      // Settled: the lazy routes arrive a tick after the render.
      await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());

      expect(container.querySelector('canvas'), path).toBeNull();
      expect(container.querySelector('img'), path).toBeNull();
      expect(container.querySelector('picture'), path).toBeNull();

      unmount();
    }
  });

  it('crosses the gate in one session without losing the app', async () => {
    // Every other case in this file renders each address on its own, so none of
    // them exercises an actual client-side navigation within one mounted app.
    render(<App />);

    fireEvent.click(screen.getByRole('link', { name: /create a game/i }));

    // CreateRoomPage reaches for Firestore/Auth as soon as it mounts, which is
    // why it is loaded on demand — `findByRole` waits out that tick.
    expect(await screen.findByRole('button', { name: /create room/i })).toBeInTheDocument();

    // Back to the gate, the way a browser's own back button does it — a real
    // `popstate`, not a second `render()` of a fresh app.
    window.history.back();

    expect(await screen.findByRole('heading', { name: /across the street/i })).toBeInTheDocument();
  });

  it('opens a room from the gate within one session, as an address typed in would', async () => {
    // There is no in-app link from `/` to a room — a guest always arrives at
    // one from outside — so this drives the same client-side navigation a
    // browser's own address bar would: `pushState` followed by the `popstate`
    // event React Router's history listens for, never a second `render()` of a
    // fresh app.
    render(<App />);

    expect(screen.getByRole('heading', { name: /across the street/i })).toBeInTheDocument();

    window.history.pushState({}, '', roomPath('room-1'));
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(await screen.findByText(/connecting to the game/i)).toBeInTheDocument();
  });
});
