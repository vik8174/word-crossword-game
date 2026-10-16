import { captureException } from '@sentry/react';
import { Component, type ReactNode } from 'react';

import { ChunkLoadError } from '../routing/chunk-load';
import { claimAutomaticReload } from '../routing/reload-mark';
import { PageFailed } from './PageFailed';

/** What the boundary has decided about the error it caught. */
type Verdict =
  /** A chunk failed and the boundary has not yet chosen between reloading and showing the page. */
  | 'deciding'
  /** The page is being reloaded by itself, once, with nothing drawn. */
  | 'reloading'
  | 'reload'
  | 'crash';

interface State {
  readonly verdict: Verdict | null;
}

interface RouteErrorBoundaryProps {
  /** The route pattern the screen is on, for the report (`/room/:roomId`, never the address). */
  readonly route: string;
  /** The release the running bundle reports; the automatic reload happens once per release. */
  readonly release: string | undefined;
  /** Reloads the page. Injected so a test can stub it. */
  readonly reload?: () => void;
  /** A full navigation to `/`. Injected for the same reason. */
  readonly goHome?: () => void;
  /** Where the once-per-release mark lives; `sessionStorage` unless given. */
  readonly storage?: Pick<Storage, 'getItem' | 'setItem'>;
  readonly children: ReactNode;
}

const reloadWindow = (): void => window.location.reload();
const goToHomePage = (): void => window.location.assign('/');

/**
 * Catches whatever a screen throws while it draws, so a white page becomes one
 * of two pages (issue #294).
 *
 * - A `ChunkLoadError` (a part of the app that could not be fetched): the first
 *   time in a release, in this tab, the page reloads by itself and nothing is
 *   drawn; after that it shows `reload`, and reports it. A failure the reload
 *   cures is not reported.
 * - Any other error: shows `crash` at once, never reloads, and always reports.
 *
 * It reports through `captureException`, because once a boundary has caught an
 * error React no longer hands it to the global handler. The tag `route` holds
 * the pattern and never the address.
 *
 * "Go to the home page" is a full navigation, so the boundary cannot keep its
 * error over a route change.
 *
 * @param props.route - The route pattern, for the report
 * @param props.release - The release of the running bundle
 * @param props.reload - Reloads the page (injected)
 * @param props.goHome - Navigates to `/` (injected)
 * @param props.storage - Holds the reload mark (injected)
 */
export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, State> {
  override state: State = { verdict: null };

  static getDerivedStateFromError(error: unknown): State {
    return { verdict: error instanceof ChunkLoadError ? 'deciding' : 'crash' };
  }

  override componentDidCatch(error: unknown): void {
    const { route, release, storage, reload = reloadWindow } = this.props;

    if (!(error instanceof ChunkLoadError)) {
      captureException(error, { tags: { route } });
      return;
    }

    if (claimAutomaticReload(release, storage)) {
      this.setState({ verdict: 'reloading' });
      reload();
      return;
    }

    captureException(error, { tags: { route } });
    this.setState({ verdict: 'reload' });
  }

  override render(): ReactNode {
    const { verdict } = this.state;
    const { reload = reloadWindow, goHome = goToHomePage, children } = this.props;

    if (verdict === null) {
      return children;
    }
    if (verdict === 'deciding' || verdict === 'reloading') {
      return null;
    }

    return <PageFailed failure={verdict} onReload={reload} onGoHome={goHome} />;
  }
}
