import { MIN_PLAYERS, wordAssignmentRefusal, type WordAssignmentRefusal } from 'shared';

/**
 * What a room waiting in the lobby says to the player reading it.
 *
 * The lobby is the first screen where two roles look at the same room and need
 * to be told different things: the owner is the only one who can start a game
 * (see `docs/decisions/0010-letterless-grid-and-private-word-list.md` and issue
 * #25), so everybody else is waiting on a person rather than on a number of
 * players. Told the same line, they read it as a room short of people.
 *
 * Whether a game can start is not decided here. It is asked of
 * `wordAssignmentRefusal` — the same question the start button asks, and the
 * same one `assignWords` asks itself — so the line above the button cannot come
 * to disagree with the button.
 */

/** Everything the lobby's line depends on: who is reading, and what the room holds. */
export interface LobbyStatusInput {
  /** `true` when the reader created the room, and so is the one who starts the game. */
  readonly isOwner: boolean;
  /** How many players are in the room right now. */
  readonly playerCount: number;
  /** How many words made it into the crossword — the words there are to deal out. */
  readonly wordCount: number;
}

/** Said to the owner of a room whose words can be dealt out right now. */
const OWNER_READY_MESSAGE =
  'The game can start now. Nobody else is needed for it — start it as soon as everybody you invited is in.';

/** Said to everybody else in that room: what they wait for is a person, not a player count. */
const GUEST_READY_MESSAGE =
  'Everybody a game needs is already here. The host is the one who starts it, and the game begins on this screen the moment they do.';

/** Why a game cannot be dealt yet, said to whoever is reading. */
const refusalMessage = (
  refusal: WordAssignmentRefusal,
  { isOwner, playerCount, wordCount }: LobbyStatusInput,
): string => {
  if (refusal === 'too-few-players') {
    // Counted rather than named, so that however many are missing, the sentence
    // stays one sentence: "needs 1 more", "needs 2 more".
    const missing = `A game takes ${MIN_PLAYERS} players, so this room needs ${MIN_PLAYERS - playerCount} more`;

    return isOwner
      ? `${missing} before you can start it — share the room link.`
      : `${missing}. The host starts the game once they are in.`;
  }

  // A crossword shorter than the room is not a wait: no arrival fixes it, and
  // nothing in the app takes a player back out of a room, so neither role is
  // pointed at something to wait for.
  const crowded = `This crossword holds ${wordCount} words and the room holds ${playerCount} players, so somebody would have nothing to guess.`;

  return isOwner
    ? `${crowded} This game cannot start — create a new room from a longer word list.`
    : `${crowded} The host cannot start this game; ask them for a link to a new one, built from a longer word list.`;
};

/**
 * The line a player is shown while the room waits in the lobby.
 *
 * @param input - Who is reading, how many players are in, and how many words the crossword holds
 * @returns What to say to that player about this room, right now
 *
 * @example
 * lobbyStatusMessage({ isOwner: false, playerCount: 2, wordCount: 12 });
 * // 'Everybody a game needs is already here. The host is the one who starts it, ...'
 */
export const lobbyStatusMessage = (input: LobbyStatusInput): string => {
  const refusal = wordAssignmentRefusal({
    wordCount: input.wordCount,
    playerCount: input.playerCount,
  });

  if (refusal === null) {
    return input.isOwner ? OWNER_READY_MESSAGE : GUEST_READY_MESSAGE;
  }

  return refusalMessage(refusal, input);
};
