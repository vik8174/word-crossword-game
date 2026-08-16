import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { logPageView } from './analytics';
import { pageViewFor } from './page-view';

/**
 * Reports every page the visitor opens, including the ones they reach without
 * loading anything.
 *
 * Firebase's own page view is switched off (see `ANALYTICS_SETTINGS` in
 * `analytics.ts`), for two reasons that point the same way. It carries the
 * address bar verbatim, room id included. And it fires once, at load: in an
 * app that routes on the client, that would report the first page of a session
 * and none of the ones the player actually walked through.
 *
 * @example
 * const RoutedPages = () => { usePageView(); return <Routes>...</Routes>; };
 */
export const usePageView = (): void => {
  const { pathname } = useLocation();

  useEffect(() => {
    void logPageView(
      pageViewFor({
        origin: window.location.origin,
        pathname,
        referrer: document.referrer,
      }),
    );
  }, [pathname]);
};
