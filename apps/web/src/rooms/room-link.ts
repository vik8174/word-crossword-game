/**
 * The one place that knows what a room's address looks like. The invite link is
 * the only way into a game (the PRD rules out any in-app invitations), so the
 * route and the shareable URL must never drift apart.
 *
 * A room is addressed in two spellings — `/room/<id>` in the browser and
 * `rooms/<id>` in Firestore — and both live here. The second used to live in
 * `room-document.ts`, which speaks to the Firestore SDK; the redaction needs
 * the name and nothing else, and reading it from there put the whole Firestore
 * SDK on the landing page, where no room is opened at all (issue #92).
 */

/** Route pattern the room screen is registered under (issue #5 renders it). */
export const ROOM_ROUTE_PATTERN = '/room/:roomId';

/** Firestore collection every room document lives in. */
export const ROOMS_COLLECTION = 'rooms';

/**
 * In-app path of a room.
 *
 * @param roomId - Id returned by `createRoom`
 * @returns Path to navigate to, without origin
 */
export const roomPath = (roomId: string): string => `/room/${roomId}`;

/**
 * Full link to a room, the one the owner copies and sends to the other players.
 *
 * @param roomId - Id returned by `createRoom`
 * @param origin - Origin the app is served from, e.g. `window.location.origin`
 * @returns Absolute URL of the room
 *
 * @example
 * roomUrl('abc123', 'https://example.com'); // 'https://example.com/room/abc123'
 */
export const roomUrl = (roomId: string, origin: string): string => `${origin}${roomPath(roomId)}`;

/**
 * The address of `/create` with a lesson already chosen, which is where a
 * teacher's ending leads ("Start a new lesson", `design/templates/state-tree.html`
 * lines 1047 and 1062). `/create` alone still opens on a game with a friend, as
 * Home's "Create a game" has it.
 */
export const NEW_LESSON_PATH = '/create?mode=lesson';

/**
 * What `/create` opens with chosen, from the address it was reached by.
 *
 * Only the one spelling `?mode=lesson` chooses a lesson; anything else, or
 * nothing, is a game with a friend. The owner can still change the choice on the
 * screen, and the address is read once, when the screen opens.
 *
 * @param search - The address's query, as `useSearchParams` hands it over
 * @returns `lesson` for `?mode=lesson`, otherwise `pair`
 *
 * @example
 * openingModeOf(new URLSearchParams('mode=lesson')); // 'lesson'
 */
export const openingModeOf = (search: URLSearchParams): 'pair' | 'lesson' =>
  search.get('mode') === 'lesson' ? 'lesson' : 'pair';
