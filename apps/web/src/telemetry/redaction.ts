/**
 * The one place a room id is taken out of text before that text leaves the
 * browser.
 *
 * A room id is not an identifier of a room — it is the whole of the access
 * control around it. The security rules let any signed-in client read any room
 * document it can name (`allow get: if isSignedIn()`), words included, which is
 * exactly why the link is the invitation (see
 * `docs/decisions/0004-ui-only-word-visibility.md`). Both telemetry SDKs would
 * ship that id on their own and without a line of our code: Firebase Analytics
 * puts the full address into `page_location`, Sentry puts it into `request.url`
 * and into every navigation breadcrumb. So everything either of them sends goes
 * through here first.
 */

import { ROOM_ROUTE_PATTERN, ROOMS_COLLECTION } from '../rooms/room-link';

declare const redactedBrand: unique symbol;

/**
 * Text that has been through {@link redactRoomId}.
 *
 * The brand exists only in the type system — nothing carries it at runtime —
 * and it buys the same thing `RoomUpdate` buys in `rooms/room-document.ts`:
 * {@link redactRoomId} becomes the only way to produce this type. Anything that
 * hands strings to a telemetry SDK asks for `Redacted` rather than `string`, so
 * passing `window.location.href` straight through is a compile error rather
 * than a room id in someone else's dashboard.
 */
export type Redacted = string & { readonly [redactedBrand]: true };

/**
 * The two shapes a room id is written in, and what each is replaced with.
 *
 * An address (`/room/<id>`) is what the SDKs collect by themselves. A Firestore
 * document path (`rooms/<id>`) is what Firebase writes into the message of a
 * rejected read or write — the errors this app logs to the console, and which
 * Sentry picks up as breadcrumbs. A run of anything but a path separator,
 * a query, a fragment, whitespace or a quote is taken to be the id.
 */
const ROOM_ID_SPELLINGS = [
  { pattern: /\/room\/[^/?#\s'"]+/g, replacement: ROOM_ROUTE_PATTERN },
  { pattern: /\brooms\/[^/?#\s'"]+/g, replacement: `${ROOMS_COLLECTION}/:roomId` },
] as const;

/**
 * Text with every room id in it replaced by a placeholder.
 *
 * Running it a second time changes nothing: the placeholders it writes are
 * themselves matched and replaced by the same placeholders, so text that has
 * already been through here is safe to send through again.
 *
 * @param text - Any text about to be sent to Analytics or Sentry
 * @returns The same text with `/room/<id>` and `rooms/<id>` made anonymous
 *
 * @example
 * redactRoomId('https://example.com/room/Xk3mQ9pLr2'); // 'https://example.com/room/:roomId'
 */
export const redactRoomId = (text: string): Redacted =>
  ROOM_ID_SPELLINGS.reduce(
    (redacted, { pattern, replacement }) => redacted.replace(pattern, replacement),
    text,
    // The brand is not a property of the value, so the cast states the one
    // thing the type system cannot see: this string came from here.
  ) as Redacted;

/**
 * What a value referring back to itself is replaced with.
 *
 * The reference itself cannot be kept: it would point at the original value,
 * whose strings are exactly the ones that were not redacted. Sentry's own
 * serializer marks circular references much like this, so an event carrying one
 * would have arrived cut short either way.
 */
const CIRCULAR = '[Circular]';

/**
 * Whether this is a bag of data rather than an instance of something.
 *
 * Class instances are left untouched: rebuilding one as a plain object would
 * lose whatever behaviour its owner expects of it, and a DOM node — which
 * breadcrumbs can carry — would be walked into an enormous copy of the page.
 */
const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype: unknown = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
};

/**
 * @param value - The value being redacted
 * @param enclosing - The values this one sits inside, to recognise a cycle by
 */
const redactWithin = (value: unknown, enclosing: Set<object>): unknown => {
  if (typeof value === 'string') {
    return redactRoomId(value);
  }

  const isArray = Array.isArray(value);

  if (!isArray && !isPlainRecord(value)) {
    return value;
  }

  if (enclosing.has(value)) {
    return CIRCULAR;
  }

  // Only what this value sits inside counts as a cycle. A value reached twice
  // by two different routes is redacted twice, which is the point: it is a
  // second place its strings would be read from.
  enclosing.add(value);

  const redacted = isArray
    ? value.map((item: unknown) => redactWithin(item, enclosing))
    : Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, redactWithin(item, enclosing)]),
      );

  enclosing.delete(value);

  return redacted;
};

/**
 * A copy of a structure with every string inside it redacted.
 *
 * This is what a whole Sentry event goes through, rather than the two or three
 * fields known today to hold a URL. An SDK release that starts reporting the
 * address somewhere new — a new breadcrumb, a new context — is then already
 * covered, which is the opposite of a list of field names that silently stops
 * being complete. There is no depth at which it gives up looking, for the same
 * reason: a limit would be a place a room id could sit and be sent.
 *
 * @param value - Anything about to be sent; a Sentry event in practice
 * @returns The same structure, with room ids taken out of every string in it
 *
 * @example
 * redactRoomIdsDeep({ request: { url: 'https://example.com/room/Xk3mQ9pLr2' } });
 */
export const redactRoomIdsDeep = <TValue>(value: TValue): TValue =>
  // Strings stay strings and every container keeps its shape, so the result is
  // the same type as what came in — which the recursion cannot say in types.
  redactWithin(value, new Set()) as TValue;
