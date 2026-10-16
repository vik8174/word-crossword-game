import { render, screen } from '@testing-library/react';
import { Component, type ReactNode, Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ChunkLoadError, lazyRoute } from './chunk-load';

/** Catches what a lazy route throws, the way a boundary would. */
const renderCatching = (Page: ReturnType<typeof lazyRoute>) => {
  const caught: unknown[] = [];
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

  class Catcher extends Component<{ children: ReactNode }, { failed: boolean }> {
    override state = { failed: false };
    static getDerivedStateFromError() {
      return { failed: true };
    }
    override componentDidCatch(error: unknown) {
      caught.push(error);
    }
    override render() {
      return this.state.failed ? <p>caught</p> : this.props.children;
    }
  }

  render(
    <Catcher>
      <Suspense fallback={<p>loading</p>}>
        <Page />
      </Suspense>
    </Catcher>,
  );
  return { caught, restore: () => spy.mockRestore() };
};

describe('lazyRoute', () => {
  it('turns a rejected import into a ChunkLoadError that keeps the cause', async () => {
    const cause = new TypeError('Failed to fetch dynamically imported module');
    const Page = lazyRoute(() => Promise.reject(cause));
    const { caught, restore } = renderCatching(Page);

    expect(await screen.findByText('caught')).toBeInTheDocument();
    restore();

    expect(caught[0]).toBeInstanceOf(ChunkLoadError);
    expect((caught[0] as ChunkLoadError).cause).toBe(cause);
  });

  it('renders the page when the import resolves', async () => {
    const Page = lazyRoute(() => Promise.resolve({ default: () => <p>the page</p> }));
    const { restore } = renderCatching(Page);

    expect(await screen.findByText('the page')).toBeInTheDocument();
    restore();
  });
});
