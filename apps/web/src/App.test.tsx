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
  it('renders the home route by default, standing on the garden picture but none of its weather', () => {
    const { container } = render(<App />);

    expect(screen.getByRole('heading', { name: /word garden/i })).toBeInTheDocument();

    // `/` shares the garden's picture and its one veil now (issue #166) but
    // not its weather: the gate creates no canvas at all, unlike every other
    // route, which the garden still draws its falling petals on one —
    // asserted below on `/room` and the catch-all. What `/` shares and what it
    // does not is `Garden.test.tsx`'s and `HomePage.test.tsx`'s to cover in
    // detail; this file only exercises the routing boundary between them.
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
    // behind it on a canvas of their own — only `/` leaves out the weather,
    // and only ever did (issue #151); the picture and the veil are shared with
    // every route now, `/` included (issue #166).
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

  it('switches the weather off and on crossing the gate, in one session, without ever losing the picture', async () => {
    // The boundary in App.tsx is not which page renders — it is `<Garden>`'s
    // own `petals` prop, flipped by which route is open, while `Garden` itself
    // stays mounted for the whole session (issue #166; it used to be mounted
    // or not, the same boundary one layer higher — issue #151). Every other
    // case in this file renders each address on its own, so none of them
    // exercises an actual client-side navigation across that boundary within
    // one mounted app, or could show a picture surviving it.
    const { container } = render(<App />);

    expect(container.querySelector('canvas')).toBeNull();

    // The exact `<img>` standing behind `/` is still standing behind `/create`
    // once the navigation settles — proof, at the level of DOM node identity
    // rather than of timing, that nothing ever unmounted the picture in
    // between. A version that recreated it (the defect this issue fixes: a
    // ~300ms window with no photograph in it while `/create`'s lazy chunk
    // loaded) would hand back a different node here.
    const gateImgBefore = container.querySelector('picture img');

    fireEvent.click(screen.getByRole('link', { name: /create a game/i }));

    // CreateRoomPage reaches for Firestore/Auth as soon as it mounts, which is
    // why it is loaded on demand — `findByRole` waits out that tick.
    expect(await screen.findByRole('button', { name: /create room/i })).toBeInTheDocument();
    expect(container.querySelectorAll('canvas').length).toBeGreaterThan(0);
    expect(container.querySelector('picture img')).toBe(gateImgBefore);

    // Back to the gate, the way a browser's own back button does it — a real
    // `popstate`, not a second `render()` of a fresh app.
    window.history.back();

    expect(await screen.findByRole('heading', { name: /word garden/i })).toBeInTheDocument();
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.querySelector('picture img')).toBe(gateImgBefore);
  });

  it('crossfades the gate into a room opened from it, in one session (issue #166)', async () => {
    // `home → connecting` is one of the two rows #153's own rule table asked
    // for and could not deliver, because `/` stood outside `Garden` and there
    // was nothing for a scene change to travel between. There is no in-app
    // link from `/` to a room — a guest always arrives at one from outside —
    // so this drives the same client-side navigation a browser's own address
    // bar would, the way the test above already does for the back button:
    // `pushState` followed by the `popstate` event React Router's history
    // listens for, never a second `render()` of a fresh app.
    const { container } = render(<App />);

    expect(screen.getByRole('heading', { name: /word garden/i })).toBeInTheDocument();

    // The picture that is settled or arriving, never one on its way out — the
    // same distinction `Garden.test.tsx`'s own `pictureSrc` draws, and for the
    // same reason: while the crossfade runs both are briefly on the page, and
    // a plain `picture img` query would find whichever happens to come first
    // in the markup rather than the one actually asked for.
    const currentPicture = () =>
      container
        .querySelector('[data-scene-role="settled"], [data-scene-role="arriving"]')
        ?.querySelector('img');

    const gateImg = currentPicture();

    window.history.pushState({}, '', roomPath('room-1'));
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(await screen.findByText(/connecting to the game/i)).toBeInTheDocument();

    // A real change of scene, not the cut this ticket closes: `connecting`
    // stands in front of `doors`, not `gate` (`sceneFor` in
    // `garden/use-room-garden.ts`), so the arriving picture is a different
    // node entirely. Checked with `waitFor` rather than immediately — the
    // text above comes from `RoomPage`'s own render, while the scene change
    // is a separate effect (`useRoomGarden`) that can commit a tick later —
    // and against the arriving picture rather than the transient `leaving`
    // layer, which is real time away from disappearing on a slow run and
    // would make this assertion racy in the other direction for no gain.
    // That the crossfade itself plays in full, and replays correctly, is
    // `Garden.test.tsx`'s to prove with fake timers it fully controls.
    await waitFor(() => {
      expect(currentPicture()).not.toBe(gateImg);
      expect(currentPicture()).toHaveAttribute('src', '/scenes/doors.jpg');
    });
  });
});
