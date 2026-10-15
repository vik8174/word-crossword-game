/**
 * What the drawing of the street is called to a reader who cannot see it, in the
 * lobby and at the door, for a pair game and for a lesson.
 *
 * Each screen writes its own whole label and `Street` uses it exactly as given
 * (#223), so the words live here, where they can be read and tested without
 * rendering a street. The pair game's labels are those of #227 (`LobbyStreet`)
 * and #226 (`JoinStreet`), unchanged. A lesson's are the same words for the
 * balconies, reworded where the teacher is the one reading, with one clause at
 * the end for the house at the end of the street. The game room's is #228's
 * label of the band over the board, with the same clause (`roomStreetLabel`).
 */

/**
 * The clause a lesson's label ends with while the teacher is at their window,
 * once. While they are away the clause is left out, because the drawing shows
 * curtains and not a person (template line 605, and the room's own label in
 * #235).
 */
export const TEACHER_CLAUSE = ', and the teacher watching from the house at the end of the street';

/**
 * Who is reading a lesson's lobby, and what that makes of the teacher.
 *
 * A teacher is told nothing about their own mark through the drawing: on their
 * own screen they are always drawn present, whatever their own mark says (the
 * notice that the room has not heard from them is what says it). So the teacher
 * has no `teacherAway` to give, and the type has no way to ask for one.
 */
export type LessonView =
  { readonly viewer: 'teacher' } | { readonly viewer: 'student'; readonly teacherAway: boolean };

/**
 * How the teacher is drawn at the end of the street for this reader.
 *
 * @param lesson - Who is reading
 * @returns `here` unless this is a student whose teacher's mark is old
 */
export const teacherDrawnFor = (lesson: LessonView): 'here' | 'away' =>
  lesson.viewer === 'student' && lesson.teacherAway ? 'away' : 'here';

/** What the lobby's label depends on. */
export interface LobbyLabelInput {
  /** How many players are in: the two who play. A lesson's teacher is not one. */
  readonly players: number;
  /** Two are in, and the second has been silent so long that the seat is free. */
  readonly seatFreedBySilence: boolean;
  /** Present in a lesson, and absent in a pair game. */
  readonly lesson?: LessonView;
}

/**
 * The balconies, said for the one who is reading.
 *
 * A student has a balcony and the teacher has none: "Your balcony" is the
 * student's words, and the teacher's lobby counts the balconies instead.
 */
const balconies = ({ players, seatFreedBySilence, lesson }: LobbyLabelInput): string => {
  if (players >= 2) {
    return seatFreedBySilence
      ? 'Both balconies taken, the curtains drawn across the street'
      : 'Both balconies taken, the line strung between them';
  }

  if (lesson?.viewer === 'teacher') {
    return players === 0
      ? 'Both balconies still empty'
      : 'One balcony taken, the other still empty';
  }

  // A pair game's host, a pair game's guest, and a lesson's student: each of
  // them is the one balcony taken, and it is theirs.
  return players === 0
    ? 'Both balconies still empty'
    : 'Your balcony, and the one across the street still empty';
};

/**
 * The label of the drawing over the lobby.
 *
 * @param input - How many are in, whether the seat was freed by silence, and, in a lesson, who is reading
 * @returns The whole label, to be handed to `Street` as it is
 *
 * @example
 * lobbyStreetLabel({ players: 1, seatFreedBySilence: false });
 * // 'Your balcony, and the one across the street still empty'
 * lobbyStreetLabel({ players: 0, seatFreedBySilence: false, lesson: { viewer: 'teacher' } });
 * // 'Both balconies still empty, and the teacher watching from the house at the end of the street'
 */
export const lobbyStreetLabel = (input: LobbyLabelInput): string =>
  balconies(input) +
  (input.lesson !== undefined && teacherDrawnFor(input.lesson) === 'here' ? TEACHER_CLAUSE : '');

/** What the band over the game's board is called: #228's label, for every game. */
export const BAND_LABEL = 'The answered words hanging on the line between the two balconies';

/**
 * The label of the band over the game's board.
 *
 * #228's label for a pair game. For a lesson it is the same words and, **once**,
 * the teacher's clause, while the teacher is drawn at their window: for a
 * student whose teacher's mark is fresh, and always for the teacher on their own
 * screen. With the curtains drawn the clause is left out, as the template does
 * (lines 605, 615 and 1018). The template's own label for the teacher's room
 * (line 1002) says the teacher twice, because the drawing adds the clause to a
 * label that already holds it; that repeat is not built.
 *
 * @param lesson - Who is reading, in a lesson; absent for a pair game
 * @returns The whole label, to be handed to `Street` as it is
 *
 * @example
 * roomStreetLabel(); // 'The answered words hanging on the line between the two balconies'
 * roomStreetLabel({ viewer: 'teacher' });
 * // 'The answered words hanging on the line between the two balconies, and the teacher watching from the house at the end of the street'
 */
export const roomStreetLabel = (lesson?: LessonView): string =>
  BAND_LABEL + (lesson !== undefined && teacherDrawnFor(lesson) === 'here' ? TEACHER_CLAUSE : '');

/** The neighbour at the door, in every room: #226's label. */
const JOIN_LABEL =
  'A neighbour waving from her balcony, holding out a line to an empty balcony across the street';

/**
 * The label of the drawing over the door into a room.
 *
 * @param teacher - In a lesson, how the teacher is drawn, which is `here` while
 * their mark is fresh and `away` once it is old; absent for a pair game
 * @returns #226's label, with the teacher's clause while the teacher is here
 */
export const joinStreetLabel = (teacher?: 'here' | 'away'): string =>
  teacher === 'here' ? JOIN_LABEL + TEACHER_CLAUSE : JOIN_LABEL;
