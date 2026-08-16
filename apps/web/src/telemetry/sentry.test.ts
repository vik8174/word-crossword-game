import type { ErrorEvent } from '@sentry/react';
import { init } from '@sentry/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { roomPath, roomUrl } from '../rooms/room-link';
import { initializeErrorReporting } from './sentry';

vi.mock('@sentry/react', () => ({ init: vi.fn() }));

const ROOM_ID = 'Xk3mQ9pLr2AbCd7eFgH1';

const sentryInit = vi.mocked(init);

/** The options Sentry was actually started with. */
const initOptions = () => {
  const options = sentryInit.mock.calls[0]?.[0];

  if (options === undefined) {
    throw new Error('Sentry was never initialized');
  }

  return options;
};

/**
 * Runs one event through the gate every event Sentry sends passes through.
 *
 * @param event - The event as Sentry assembled it, room ids and all
 * @returns The event as it would leave the browser
 */
const asSent = (event: Partial<ErrorEvent>) => {
  const { beforeSend } = initOptions();

  if (beforeSend === undefined) {
    throw new Error('Sentry was started with nothing filtering its events');
  }

  return beforeSend(event as ErrorEvent, {});
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('initializeErrorReporting', () => {
  it('starts Sentry with the DSN and the environment it was given', () => {
    const started = initializeErrorReporting({
      VITE_SENTRY_DSN: 'https://key@o0.ingest.sentry.io/0',
      VITE_SENTRY_ENVIRONMENT: 'stage',
    });

    expect(started).toBe(true);
    expect(initOptions()).toMatchObject({
      dsn: 'https://key@o0.ingest.sentry.io/0',
      environment: 'stage',
    });
  });

  it('stays out of the way when there is no DSN', () => {
    expect(initializeErrorReporting({})).toBe(false);
    expect(sentryInit).not.toHaveBeenCalled();
  });

  it('treats an empty DSN as no DSN — a developer without an .env file', () => {
    expect(initializeErrorReporting({ VITE_SENTRY_DSN: '' })).toBe(false);
    expect(sentryInit).not.toHaveBeenCalled();
  });

  it('says the environment is unknown rather than guessing one', () => {
    initializeErrorReporting({ VITE_SENTRY_DSN: 'https://key@o0.ingest.sentry.io/0' });

    // Stage and production are both built as `production`, so a build that
    // forgot the variable must not quietly report itself as either.
    expect(initOptions().environment).toBe('unknown');
  });

  it('switches on neither tracing nor session replay', () => {
    initializeErrorReporting({ VITE_SENTRY_DSN: 'https://key@o0.ingest.sentry.io/0' });

    // Both would send exactly what this app is careful not to: tracing reports
    // every navigation by URL, replay records the DOM the words are drawn into.
    expect(initOptions().integrations).toBeUndefined();
    expect(initOptions()).not.toHaveProperty('tracesSampleRate');
    expect(initOptions()).not.toHaveProperty('replaysSessionSampleRate');
    expect(initOptions()).not.toHaveProperty('replaysOnErrorSampleRate');
  });
});

describe('the event Sentry is allowed to send', () => {
  beforeEach(() => {
    initializeErrorReporting({
      VITE_SENTRY_DSN: 'https://key@o0.ingest.sentry.io/0',
      VITE_SENTRY_ENVIRONMENT: 'stage',
    });
  });

  it('carries no room id, wherever the SDK put one', () => {
    const sent = asSent({
      request: { url: roomUrl(ROOM_ID, 'https://example.com') },
      breadcrumbs: [
        { category: 'navigation', data: { from: '/create', to: roomPath(ROOM_ID) } },
        { category: 'console', message: `Joining the room failed: rooms/${ROOM_ID}` },
      ],
      message: `Something went wrong at ${roomPath(ROOM_ID)}`,
    });

    expect(JSON.stringify(sent)).not.toContain(ROOM_ID);
  });

  it('is still sent, and still says what happened', () => {
    const sent = asSent({
      request: { url: roomUrl(ROOM_ID, 'https://example.com') },
      message: 'Recording the answer failed',
    });

    expect(sent).toMatchObject({
      request: { url: 'https://example.com/room/:roomId' },
      message: 'Recording the answer failed',
    });
  });
});
