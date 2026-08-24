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
 * How often a screen re-reads the marks it is showing, in milliseconds.
 *
 * Nothing arrives to say a player has gone quiet — the absence of a write is
 * the news — so a screen that only re-rendered on snapshots would keep showing
 * a room as it stood when the last of them landed. Short enough that a line
 * appears within a few seconds of it becoming true, and this costs a re-render
 * of a player list rather than of a game.
 */
export const PRESENCE_TICK_MS = 5_000;

/**
 * How stale a mark has to be for its player to be shown as away, in
 * milliseconds — three write periods, so a single missed beat says nothing.
 */
export const AWAY_AFTER_MS = 45_000;

/**
 * How stale a mark has to be before somebody arriving may take that seat, in
 * milliseconds — four missed write periods.
 *
 * Deliberately further out than {@link AWAY_AFTER_MS}, and that gap is the
 * point rather than its width: the line beside a name is taken back the moment
 * its player writes again, while a seat given away cannot be. People step out
 * of a lobby for a minute at a time — the owner is off in a messenger sending
 * the very link the game needs — and mobile browsers throttle timers in a
 * backgrounded tab, so the threshold that costs something is still the slower
 * of the two.
 *
 * Waiting is not free either, and it is the host who pays: while their vanished
 * guest's seat is held, there is nobody they can give it to. What the whole of
 * this threshold decides is recorded in
 * `docs/decisions/0025-what-happens-to-the-seat-of-a-player-who-left.md`.
 */
export const SEAT_FREE_AFTER_MS = 60_000;

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
 * How long a player has been quiet, said the way a person waiting would say it.
 *
 * The duration is half of what the line beside a name is for: "blinked" and
 * "gone" look the same without it, and which one it is decides whether the
 * others keep waiting. It is rounded down to the unit it is said in, so it
 * never claims more silence than there has been.
 *
 * Only the length is worded here, not what it means — the same duration is read
 * out to the player it is about ("the room has not heard from you for...") and
 * about somebody else ("away for..."), and a phrase built for one of those
 * would have to be unpicked for the other.
 *
 * @param silenceMs - Milliseconds since the player's last mark, from {@link silenceOf}
 * @returns How long it has been, as a length of time and nothing more
 *
 * @example
 * silenceLabel(125_000); // '2 min'
 */
export const silenceLabel = (silenceMs: number): string => {
  if (silenceMs < MINUTE_MS) {
    return 'under a minute';
  }

  if (silenceMs < HOUR_MS) {
    return `${Math.floor(silenceMs / MINUTE_MS)} min`;
  }

  return `${Math.floor(silenceMs / HOUR_MS)} h`;
};

/**
 * How long each player of this room has been quiet, for those who have been.
 *
 * A player who is present has no entry at all, which is the whole shape of what
 * the screen says: only a deviation is worth a label, since one that appears on
 * every row is read as decoration and says nothing — the lesson `Players (2 of
 * 4)` cost (issue #29).
 *
 * @param room - The room document as read from Firestore
 * @param now - The moment to judge every mark against
 * @returns How long they have been away, by player id, for the away ones only
 *
 * @example
 * awayDurationsIn(room, new Date()); // { 'guest-uid': '2 min' }
 */
export const awayDurationsIn = (room: ReadableRoom, now: Date): Readonly<Record<string, string>> =>
  Object.fromEntries(
    Object.entries(room.players)
      .filter(([, player]) => isAway(player, now))
      .map(([playerId, player]) => [playerId, silenceLabel(silenceOf(player, now))]),
  );

/**
 * Whether this room is waiting on a mark from this player.
 *
 * Two conditions, and both are about somebody waiting on the other side of it.
 * A room takes marks only from the players it holds: whoever opened the link
 * and has yet to give a nickname is not in the game, and has nothing to be
 * present for. And it takes them only while it is being waited in or played —
 * a room that has ended is over however it ended, so a mark in it would tell
 * nobody anything, while every write pushes `expiresAt` another 24 hours out
 * (`docs/decisions/0013-keeping-a-room-alive-on-every-write.md`), which would
 * leave a tab forgotten on a finished game keeping that room alive for good.
 * That is also what makes a room somebody ended actually go away: the marks
 * stop with the game, so its 24 hours start counting down from the ending
 * rather than from the last tab being closed
 * (`docs/decisions/0027-a-game-a-player-can-end.md`).
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
