import { render, screen } from '@testing-library/react';
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
  render(<App />);
};

afterEach(() => {
  window.history.pushState({}, '', '/');
});

describe('App', () => {
  it('renders the home route by default', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /word crossword game/i })).toBeInTheDocument();
  });

  it('opens a room at the address invite links point at', () => {
    open(roomPath('room-1'));

    expect(screen.getByRole('heading', { name: /game room/i })).toBeInTheDocument();
  });

  it('explains an address it knows nothing about instead of showing a blank page', () => {
    open('/room');

    expect(screen.getByRole('heading', { name: /does not exist/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to the start/i })).toHaveAttribute('href', '/');
  });
});
