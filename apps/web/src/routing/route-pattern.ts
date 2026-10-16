import { matchPath } from 'react-router-dom';

import { ROOM_ROUTE_PATTERN } from '../rooms/room-link';

/** What an address nobody planned for is reported as. */
export const UNMATCHED_ROUTE = '*';

/** The patterns the app registers, in `App.tsx`. */
const PATTERNS = ['/', '/create', ROOM_ROUTE_PATTERN] as const;

/**
 * The route pattern an address belongs to, for a report.
 *
 * The pattern and not the address: `/room/:roomId`, never `/room/abc`, because
 * the room id is the only lock on a room (ADR 0023).
 *
 * @param pathname - The path of the current address
 * @returns The registered pattern it matches, or `*`
 */
export const routePatternOf = (pathname: string): string =>
  PATTERNS.find((pattern) => matchPath({ path: pattern, end: true }, pathname) !== null) ??
  UNMATCHED_ROUTE;
