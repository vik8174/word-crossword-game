import { init } from '@sentry/react';

import { redactRoomIdsDeep } from './redaction';

/**
 * Error reporting: JavaScript errors and unhandled promise rejections, and
 * deliberately nothing else.
 *
 * Sentry's default integrations already catch both. What is left to decide is
 * what must not be switched on and what must not leave the browser — see
 * `docs/decisions/0014-telemetry-without-room-ids.md`.
 */

/** Env shape this module reads — a subset of `import.meta.env`. */
export interface SentryEnv {
  /** Project DSN; absent in a checkout with no `.env`, and in tests. */
  readonly VITE_SENTRY_DSN?: string;
  /** Which deployment this build is: `stage` today, `production` one day. */
  readonly VITE_SENTRY_ENVIRONMENT?: string;
}

/**
 * What an environment is called when the build did not say.
 *
 * Not derived from `import.meta.env.MODE`: stage and production are both built
 * as `production`, so guessing from the build mode would file stage errors
 * under the name of a deployment they did not come from (see
 * `docs/decisions/0007-stage-only-environment.md`).
 */
const UNKNOWN_ENVIRONMENT = 'unknown';

/**
 * Starts error reporting, unless there is nowhere to report to.
 *
 * A checkout without an `.env` file — a developer who has just cloned the
 * repository, and every test run — has no DSN, and that is not a failure: it
 * means errors stay in the console, which is where that developer is looking
 * anyway. Nothing is initialized and nothing is sent.
 *
 * @param env - Env source to read from (production passes `import.meta.env`)
 * @returns `true` when Sentry was started, `false` when there was no DSN
 *
 * @example
 * initializeErrorReporting(import.meta.env);
 */
export const initializeErrorReporting = (env: SentryEnv): boolean => {
  const dsn = env.VITE_SENTRY_DSN;

  if (!dsn) {
    return false;
  }

  init({
    dsn,
    environment: env.VITE_SENTRY_ENVIRONMENT || UNKNOWN_ENVIRONMENT,

    // No `integrations`, no `tracesSampleRate`, no replay sample rates, and
    // that is the configuration rather than an omission. Browser tracing
    // reports every navigation by its URL and session replay records the DOM —
    // the two things this app spent three tickets keeping the words and the
    // room id out of.

    /**
     * The last thing that happens to every event Sentry sends.
     *
     * The SDK collects the address by itself — `request.url`, navigation
     * breadcrumbs, the console lines this app logs on a failed write — and the
     * address contains the id that is the only lock on a room. Nothing else
     * bypasses this: without tracing and replay, `beforeSend` is the single
     * exit from the browser.
     */
    beforeSend: (event) => redactRoomIdsDeep(event),
  });

  return true;
};
