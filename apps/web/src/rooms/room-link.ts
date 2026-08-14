/**
 * The one place that knows what a room's address looks like. The invite link is
 * the only way into a game (the PRD rules out any in-app invitations), so the
 * route and the shareable URL must never drift apart.
 */

/** Route pattern the room screen is registered under (issue #5 renders it). */
export const ROOM_ROUTE_PATTERN = '/room/:roomId';

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
