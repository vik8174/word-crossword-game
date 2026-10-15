import { MIN_PLAYERS, wordAssignmentRefusal, type WordAssignmentRefusal } from 'shared';

import { wordsLabel } from './grid-caption';

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

/**
 * What a lesson's lobby says differently from a pair game's: who the teacher is
 * and whether the reader is told they are away.
 */
export interface LobbyLessonInput {
  /** The teacher's nickname, for the reader who is waiting on them. */
  readonly teacherName: string;
  /**
   * Whether the teacher's mark is old **as this reader sees it**. Always `false`
   * for the teacher's own screen, where they are drawn present whatever their
   * own mark (`docs/decisions/0037-a-lesson-is-run-by-a-teacher-who-does-not-play.md`).
   */
  readonly teacherAway: boolean;
}

/** Everything the lobby's line depends on: who is reading, and what the room holds. */
export interface LobbyStatusInput {
  /**
   * `true` when the reader created the room, and so is the one who starts the
   * game: the host of a pair game, the teacher of a lesson.
   */
  readonly isOwner: boolean;
  /** How many players are in the room right now. A lesson's teacher is not one. */
  readonly playerCount: number;
  /** How many words made it into the crossword — the words there are to deal out. */
  readonly wordCount: number;
  /** Present when the room is a lesson, and absent in a pair game. */
  readonly lesson?: LobbyLessonInput;
}

/** Said to the owner of a room whose words can be dealt out right now. */
const OWNER_READY_MESSAGE = 'The game can start now. Nobody else is needed for it.';

/** Said to everybody else in that room: what they wait for is a person, not a player count. */
const GUEST_READY_MESSAGE =
  'Everybody a game needs is here. The host starts it, and the game begins on this screen the moment they do.';

/** What the reader waits on to start: the teacher by name in a lesson, the host in a pair game. */
const starterOf = ({ lesson }: LobbyStatusInput): string => lesson?.teacherName ?? 'The host';

/** Why a game cannot be dealt yet, said to whoever is reading. */
const refusalMessage = (refusal: WordAssignmentRefusal, input: LobbyStatusInput): string => {
  const { isOwner, playerCount, wordCount, lesson } = input;

  if (refusal === 'too-few-players') {
    // Counted rather than named, so that however many are missing, the sentence
    // stays one sentence: "needs 1 more", "needs 2 more".
    const kind = lesson === undefined ? 'A game' : 'A lesson';
    const missing = `${kind} takes ${MIN_PLAYERS} players, so this room needs ${MIN_PLAYERS - playerCount} more`;

    return isOwner
      ? `${missing} before you can start it. Share the room link.`
      : `${missing}. ${starterOf(input)} starts the game once they are in.`;
  }

  // A crossword shorter than the room is not a wait: no arrival fixes it, and
  // nothing in the app takes a player back out of a room, so neither role is
  // pointed at something to wait for.
  const crowded = `This crossword holds ${wordsLabel(wordCount)} and the room holds ${playerCount} players, so somebody would have nothing to guess.`;

  return isOwner
    ? `${crowded} This game cannot start. Create a new room from a longer word list.`
    : `${crowded} ${starterOf(input)} cannot start this game; ask for a link to a new one.`;
};

/**
 * What a lesson's lobby says once both students are in and the deal could go
 * ahead: to the teacher that it can, to a student who it waits on, and when that
 * is somebody they cannot hear from, that only they can.
 */
const lessonReadyMessage = (isOwner: boolean, { teacherName, teacherAway }: LobbyLessonInput) => {
  if (isOwner) {
    return 'Both players are here. The lesson can start now.';
  }

  return teacherAway
    ? `Both players are here. Only ${teacherName} can start the lesson.`
    : `Both players are here. ${teacherName} starts the lesson, and it begins on this screen the moment they do.`;
};

/**
 * The line a player is shown while the room waits in the lobby.
 *
 * @param input - Who is reading, how many players are in, how many words the crossword holds,
 * and, in a lesson, who teaches it
 * @returns What to say to that player about this room, right now
 *
 * @example
 * lobbyStatusMessage({ isOwner: false, playerCount: 2, wordCount: 12 });
 * // 'Everybody a game needs is here. The host starts it, ...'
 */
export const lobbyStatusMessage = (input: LobbyStatusInput): string => {
  const refusal = wordAssignmentRefusal({
    wordCount: input.wordCount,
    playerCount: input.playerCount,
  });

  if (refusal === null) {
    if (input.lesson !== undefined) {
      return lessonReadyMessage(input.isOwner, input.lesson);
    }

    return input.isOwner ? OWNER_READY_MESSAGE : GUEST_READY_MESSAGE;
  }

  return refusalMessage(refusal, input);
};
