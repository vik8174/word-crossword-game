import type { RoomDocument } from '../rooms/room-document';
import type {
  endGameEarly as endTheGame,
  recordGuess as recordTheGuess,
} from '../rooms/room-service';

/**
 * The two writes a game makes. `recordGuess` and `endGameEarly` unless given:
 * handed in only by the workshop, so that the screens behind a refused write
 * (`playing/guessfail`, `playing/endfail`) and the one mid-write
 * (`playing/ending`) can be drawn without a database, which cannot be made to
 * refuse one (`updateDoc` queues a write that cannot be sent).
 */
export interface RoomGameWrites {
  readonly recordGuess: typeof recordTheGuess;
  readonly endGameEarly: typeof endTheGame;
}

/** What a screen of a game in progress is given, the player's and the teacher's alike. */
export interface RoomGameProps {
  /** Id of the room, for the answers and the ending this screen writes. */
  readonly roomId: string;
  /** The room as it stands, following live updates from Firestore. */
  readonly room: RoomDocument;
  /** UID of the person looking at it, so they see their own half of the game. */
  readonly viewerId: string;
  /** The two writes; the workshop's way to draw a refused one. */
  readonly writes?: RoomGameWrites;
}
