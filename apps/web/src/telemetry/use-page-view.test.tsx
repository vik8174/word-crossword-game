import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { logEvent, setDefaultEventParameters } from 'firebase/analytics';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { roomPath } from '../rooms/room-link';
import { applyInternalTrafficMark } from './internal-traffic';
import { usePageView } from './use-page-view';

vi.mock('firebase/analytics', () => ({
  initializeAnalytics: vi.fn(() => ({ app: 'fake-analytics' })),
  isSupported: vi.fn(() => Promise.resolve(true)),
  logEvent: vi.fn(),
  setDefaultEventParameters: vi.fn(),
}));

const ROOM_ID = 'Xk3mQ9pLr2AbCd7eFgH1';

/** Two pages with a link between them, watched by the hook under test. */
const Pages = () => {
  usePageView();

  return (
    <Routes>
      <Route path="/" element={<Link to={roomPath(ROOM_ID)}>Open the room</Link>} />
      <Route path="/room/:roomId" element={<p>The room</p>} />
    </Routes>
  );
};

const openAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Pages />
    </MemoryRouter>,
  );

/** The parameters of every `page_view` reported so far. */
const reportedPages = () =>
  vi
    .mocked(logEvent)
    .mock.calls.filter(([, name]) => name === 'page_view')
    .map(([, , params]) => params as Record<string, unknown>);

/** The default parameters as they stood after the most recent page view. */
const defaultsNow = () =>
  vi.mocked(setDefaultEventParameters).mock.calls.at(-1)?.[0] as Record<string, unknown>;

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

describe('usePageView', () => {
  it('reports the page the visitor arrived on', async () => {
    openAt('/');

    await waitFor(() => {
      expect(reportedPages()).toEqual([expect.objectContaining({ page_path: '/' })]);
    });
  });

  it('reports a room without naming which room', async () => {
    openAt(roomPath(ROOM_ID));

    await waitFor(() => {
      expect(reportedPages()).toHaveLength(1);
    });

    expect(JSON.stringify(reportedPages())).not.toContain(ROOM_ID);
    expect(reportedPages()[0]).toMatchObject({ page_path: '/room/:roomId' });
  });

  it('keeps a marked browser marked once it moves off the page it was marked on', async () => {
    window.history.replaceState({}, '', '/?internal=1');
    applyInternalTrafficMark();

    openAt('/');
    await waitFor(() => {
      expect(reportedPages()).toHaveLength(1);
    });

    fireEvent.click(screen.getByRole('link', { name: /open the room/i }));

    await waitFor(() => {
      expect(reportedPages()).toHaveLength(2);
    });
    expect(reportedPages()[1]).toMatchObject({ traffic_type: 'internal' });
    // What every event after this navigation carries, page views included.
    expect(defaultsNow()).toMatchObject({ page_path: '/room/:roomId', traffic_type: 'internal' });
  });

  it('reports a page reached without a reload, which the SDK never would', async () => {
    openAt('/');
    await waitFor(() => {
      expect(reportedPages()).toHaveLength(1);
    });

    fireEvent.click(screen.getByRole('link', { name: /open the room/i }));

    await waitFor(() => {
      expect(reportedPages()).toHaveLength(2);
    });
    expect(reportedPages()[1]).toMatchObject({ page_path: '/room/:roomId' });
  });
});
