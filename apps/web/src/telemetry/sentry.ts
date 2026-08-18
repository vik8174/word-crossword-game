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
  /** Which deployment this build is: `stage` or `production`. */
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  /** Which build this is, so Sentry can find the source maps it uploaded. */
  readonly VITE_SENTRY_RELEASE?: string;
}

/**
 * What an environment is called when the build did not say.
 *
 * Not derived from `import.meta.env.MODE`: stage and production are both built
 * as `production`, so guessing from the build mode would file stage errors
 * under the name of a deployment they did not come from. Both deployments
 * report into one Sentry project and this is what separates them, which is why
 * the deploy sets it from the ref rather than reading it from a settings page
 * it could be missing from (see
 * `docs/decisions/0020-two-environments-and-a-deploy-that-runs-itself.md`).
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

    /**
     * The name the build filed its source maps under, put here by
     * `vite.config.ts` so that both sides say the same thing. A minified frame
     * is only translated back into a file and a line when the event and the
     * maps agree on it. Undefined in a build that had no revision to name
     * itself after, and in every test.
     */
    release: env.VITE_SENTRY_RELEASE || undefined,

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
