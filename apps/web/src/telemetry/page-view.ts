import { redactRoomId, type Redacted } from './redaction';

/**
 * What one page view says, and the only thing able to build one.
 *
 * Every field is {@link Redacted}, so a page view cannot be assembled out of
 * raw browser values at all — {@link pageViewFor} is the single door, and it
 * redacts on the way through.
 */
export interface PageView {
  /** Absolute address of the page, with no room id in it. */
  readonly location: Redacted;
  /** In-app path of the page, with no room id in it. */
  readonly path: Redacted;
  /** Where the visitor came from, with no room id in it; empty when unknown. */
  readonly referrer: Redacted;
}

/** The parts of `window.location` and `document` a page view is built from. */
export interface BrowserLocation {
  /** `window.location.origin`. */
  readonly origin: string;
  /** `window.location.pathname`. */
  readonly pathname: string;
  /** `document.referrer`; the empty string when there is none. */
  readonly referrer: string;
}

/**
 * The page view for the address currently open.
 *
 * The query string and the fragment are not read at all rather than being
 * cleaned: nothing in this app puts anything into either, so anything that
 * appeared there later would be something nobody meant to report — and the
 * safe default for a value nobody designed is not to send it.
 *
 * @param location - Origin, path and referrer as the browser has them
 * @returns The same page, said in a way that names no room
 *
 * @example
 * pageViewFor({ origin: window.location.origin, pathname: window.location.pathname, referrer: document.referrer });
 */
export const pageViewFor = ({ origin, pathname, referrer }: BrowserLocation): PageView => ({
  location: redactRoomId(`${origin}${pathname}`),
  path: redactRoomId(pathname),
  referrer: redactRoomId(referrer),
});
