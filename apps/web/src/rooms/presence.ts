import type { MillisecondTimestamp, ReadableRoom } from './room-access';
import type { RoomPlayer } from './room-document';

/**
 * Who is still there, read from the mark each player writes for themselves.
 *
 * A room has no server of ours to notice a browser going away
 * (`docs/decisions/0002-no-dedicated-backend.md`), and no client can be asked
 * to announce its own departure — the tab that has to be got rid of is usually
 * the one nobody can reach, a webview inside a messenger that was closed
 * (issue #47). So presence is a timestamp: every client rewrites
 * `players.<uid>.lastSeenAt` while it is in a room, and everyone else reads how
 * old that mark has grown.
 *
 * Pure, and free of the Firestore SDK — it only reads milliseconds off a
 * timestamp — so all three thresholds can be checked with a clock the test
 * moves by hand.
 *
 * The numbers and what hangs off them are recorded in
 * `docs/decisions/0022-a-mark-a-player-writes-for-themselves.md`.
 */

/** How often a client rewrites its own mark, in milliseconds. */
export const PRESENCE_PERIOD_MS = 15_000;

/**
 * How stale a mark has to be for its player to be shown as away, in
 * milliseconds — three write periods, so a single missed beat says nothing.
 */
export const AWAY_AFTER_MS = 45_000;

/**
 * How stale a mark has to be before somebody arriving may take that seat, in
 * milliseconds.
 *
 * Deliberately much further out than {@link AWAY_AFTER_MS}: the line beside a
 * name is taken back the moment its player writes again, while a seat given
 * away cannot be. People step out of a lobby for a minute at a time — the owner
 * is off in a messenger sending the very link the game needs — and mobile
 * browsers throttle timers in a backgrounded tab, so the threshold that costs
 * something has to be the generous one.
 */
export const SEAT_FREE_AFTER_MS = 90_000;

/** All this module needs of a player: the two moments they can be dated by. */
export type SeenPlayer = RoomPlayer<MillisecondTimestamp>;

/**
 * How long it has been since this player was last known to be there.
 *
 * A player with no mark is dated from `joinedAt`, which is the last moment the
 * room can honestly claim they were seen: rooms written before presence existed
 * have players without the field, and treating that as "never seen" would show
 * somebody as away on the strength of a field nobody's client was writing yet.
 *
 * @param player - The player's entry in the room's `players` map
 * @param now - The moment to measure from
 * @returns Milliseconds since their last mark; negative if it is in the future
 *
 * @example
 * silenceOf(player, new Date()); // 46_000
 */
export const silenceOf = (player: SeenPlayer, now: Date): number =>
  now.getTime() - (player.lastSeenAt ?? player.joinedAt).toMillis();

/**
 * Whether this player has gone quiet for long enough to be worth saying so.
 *
 * @param player - The player's entry in the room's `players` map
 * @param now - The moment to judge the mark against
 * @returns `true` when their mark is older than {@link AWAY_AFTER_MS}
 */
export const isAway = (player: SeenPlayer, now: Date): boolean =>
  silenceOf(player, now) > AWAY_AFTER_MS;

/**
 * Whether this player has been quiet for long enough that their seat is nobody's.
 *
 * Only ever asked of a lobby, and never of the owner's seat — both of which are
 * `abandonedSeatIn`'s business in `room-access.ts`, since it takes a whole room
 * to know either.
 *
 * @param player - The player's entry in the room's `players` map
 * @param now - The moment to judge the mark against
 * @returns `true` when their mark is older than {@link SEAT_FREE_AFTER_MS}
 */
export const hasLeftTheSeat = (player: SeenPlayer, now: Date): boolean =>
  silenceOf(player, now) > SEAT_FREE_AFTER_MS;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/**
 * How long a player has been away, said the way a person waiting would say it.
 *
 * The duration is half of what the line is for: "blinked" and "gone" look the
 * same without it, and which one it is decides whether the others keep waiting.
 * It is rounded down to the unit it is said in, so the label never claims more
 * silence than there has been.
 *
 * @param silenceMs - Milliseconds since the player's last mark, from {@link silenceOf}
 * @returns The wording that goes beside their name
 *
 * @example
 * awayLabel(125_000); // 'away for 2 min'
 */
export const awayLabel = (silenceMs: number): string => {
  if (silenceMs < MINUTE_MS) {
    return 'away for under a minute';
  }

  if (silenceMs < HOUR_MS) {
    return `away for ${Math.floor(silenceMs / MINUTE_MS)} min`;
  }

  return `away for ${Math.floor(silenceMs / HOUR_MS)} h`;
};

/**
 * Whether this room is waiting on a mark from this player.
 *
 * Two conditions, and both are about somebody waiting on the other side of it.
 * A room takes marks only from the players it holds: whoever opened the link
 * and has yet to give a nickname is not in the game, and has nothing to be
 * present for. And it takes them only while it is being waited in or played —
 * a `completed` room is over, so a mark in it would tell nobody anything, while
 * every write pushes `expiresAt` another 24 hours out
 * (`docs/decisions/0013-keeping-a-room-alive-on-every-write.md`), which would
 * leave a tab forgotten on a finished game keeping that room alive for good.
 *
 * @param room - The room document as read from Firestore
 * @param playerId - Firebase Auth UID of the client asking whether to write
 * @returns `true` when this client should be marking itself present
 *
 * @example
 * if (awaitsPresenceFrom(room, playerId)) await markPresence({ roomId, playerId });
 */
export const awaitsPresenceFrom = (room: ReadableRoom, playerId: string): boolean =>
  (room.status === 'lobby' || room.status === 'playing') && Object.hasOwn(room.players, playerId);
