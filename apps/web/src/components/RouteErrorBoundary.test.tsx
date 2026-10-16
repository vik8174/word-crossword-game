import * as Sentry from '@sentry/react';
import { ThemeProvider } from '@mui/material/styles';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChunkLoadError } from '../routing/chunk-load';
import { theme } from '../theme';
import { RouteErrorBoundary } from './RouteErrorBoundary';

vi.mock('@sentry/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@sentry/react')>()),
  captureException: vi.fn(),
}));

const Throws = ({ error }: { error: unknown }): never => {
  throw error;
};

const memoryStorage = () => {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
};

const setup = (
  error: unknown,
  over: { release?: string; storage?: ReturnType<typeof memoryStorage> } = {},
) => {
  const reload = vi.fn();
  const goHome = vi.fn();
  const storage = over.storage ?? memoryStorage();
  const view = render(
    <ThemeProvider theme={theme}>
      <RouteErrorBoundary
        route="/room/:roomId"
        release={over.release ?? '1.3.0+aaa'}
        reload={reload}
        goHome={goHome}
        storage={storage}
      >
        <Throws error={error} />
      </RouteErrorBoundary>
    </ThemeProvider>,
  );
  return { reload, goHome, storage, view };
};

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(Sentry.captureException).mockClear();
});

describe('RouteErrorBoundary', () => {
  it('shows crash at once for a render error, without reloading, and reports it with the route pattern', () => {
    const error = new Error('boom');
    const { reload } = setup(error);

    expect(
      screen.getByRole('heading', { name: 'Something went wrong on our side' }),
    ).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      tags: { route: '/room/:roomId' },
    });
  });

  it('reloads once, drawing nothing and reporting nothing, for the first chunk failure of a release', () => {
    const { reload, storage } = setup(new ChunkLoadError(new TypeError('x')));

    expect(reload).toHaveBeenCalledTimes(1);
    expect(storage.getItem('chunk-reload:1.3.0+aaa')).not.toBeNull();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('shows reload, and reports it, when the reload mark is already there', () => {
    const storage = memoryStorage();
    storage.setItem('chunk-reload:1.3.0+aaa', '1');
    const error = new ChunkLoadError(new TypeError('x'));
    const { reload } = setup(error, { storage });

    expect(
      screen.getByRole('heading', { name: 'This page could not be opened' }),
    ).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      tags: { route: '/room/:roomId' },
    });
  });

  it('reloads again for a new release', () => {
    const storage = memoryStorage();
    storage.setItem('chunk-reload:1.3.0+aaa', '1');
    const { reload } = setup(new ChunkLoadError(new TypeError('x')), {
      release: '1.3.0+bbb',
      storage,
    });

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('tells the two by class, not by message text', () => {
    setup(new Error('Failed to fetch dynamically imported module'));

    expect(
      screen.getByRole('heading', { name: 'Something went wrong on our side' }),
    ).toBeInTheDocument();
  });

  it('crash: "Reload the page" reloads and "Go to the home page" leaves for /', () => {
    const { reload, goHome } = setup(new Error('boom'));

    fireEvent.click(screen.getByRole('button', { name: 'Reload the page' }));
    expect(reload).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Go to the home page' }));
    expect(goHome).toHaveBeenCalledTimes(1);
  });

  it('reload: offers only "Reload the page"', () => {
    const storage = memoryStorage();
    storage.setItem('chunk-reload:1.3.0+aaa', '1');
    setup(new ChunkLoadError(new TypeError('x')), { storage });

    expect(screen.getByRole('button', { name: 'Reload the page' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Go to the home page' })).not.toBeInTheDocument();
  });
});
