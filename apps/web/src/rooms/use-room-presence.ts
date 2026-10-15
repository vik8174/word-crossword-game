import { awayDurationsIn } from './presence';
import type { RoomDocument } from './room-document';
import { usePresenceNow } from './use-presence-now';

/**
 * Reads the room's marks on a clock of its own, so silence can be noticed.
 *
 * Every other screen in this app is a function of the document that last
 * arrived, and this is the one thing that cannot be: what makes a player away
 * is a write that did **not** happen, and no snapshot carries that. Left to
 * re-render on snapshots alone, a room whose players have all gone quiet would
 * go on showing them as present precisely because nobody is writing to it.
 *
 * So the clock ticks here rather than at the room screen: what is re-rendered
 * every few seconds is the player list, not the grid a game is played on.
 *
 * @param room - The room as it last arrived
 * @returns How long each away person has been away, by UID (a lesson's teacher
 * under the room's `ownerId`); the present have no entry, and the map is empty
 * when everybody is there
 *
 * @example
 * const awayDurations = useRoomPresence(room);
 */
export const useRoomPresence = (room: RoomDocument): Readonly<Record<string, string>> =>
  awayDurationsIn(room, usePresenceNow());
