import useMediaQuery from '@mui/material/useMediaQuery';

import { FROM_WIDE } from './frame-styles';
import { Street } from './Street';
import { type LessonView, lobbyStreetLabel, teacherDrawnFor } from './street-labels';

interface LobbyStreetProps {
  /** How many players are in: the two who play. A lesson's teacher is not one. */
  readonly players: number;
  /** Two players in, and the second has been silent so long that the seat is free. */
  readonly seatFreedBySilence: boolean;
  /**
   * Who is reading a lesson's lobby, which is what adds the teacher's house to
   * the drawing. Left out for a pair game, where its shutters stay closed.
   */
  readonly lesson?: LessonView;
}

/**
 * The drawing over the lobby, which says who is in (`lobby`, `lobby/waiting`
 * and, in a lesson, `lobby/nostudent` and `lobby/teacheraway` of the template,
 * lines 940-947), with its labels (`street-labels.ts`):
 *
 * - nobody in (a lesson's first lobby): both balconies dark, no neighbour on
 *   either, no line strung yet;
 * - one in: the other balcony empty and no line, the neighbour waiting;
 * - both in: both balconies taken and the line taut, the neighbours waving;
 * - a seat freed by silence: both are still in the room, but the curtains of the
 *   second are drawn (`right="away"`) while the line stays taut.
 *
 * In a lesson the teacher is at the end of the street, at their window while
 * their mark is fresh as this reader sees it and with the curtains drawn when it
 * is old. On the teacher's own screen they are always at it.
 *
 * Cropped to the top, and on a wide window (`FROM_WIDE`, width only) to the
 * ground: the houses whole, down to the street. One drawing in the DOM, whose
 * crop follows the window.
 *
 * @param props.players - How many players are in
 * @param props.seatFreedBySilence - The second player's seat has been freed by silence
 * @param props.lesson - Who is reading, in a lesson
 *
 * @example
 * <LobbyStreet players={2} seatFreedBySilence={false} />
 * <LobbyStreet players={0} seatFreedBySilence={false} lesson={{ viewer: 'teacher' }} />
 */
export const LobbyStreet = ({ players, seatFreedBySilence, lesson }: LobbyStreetProps) => {
  const label = lobbyStreetLabel({ players, seatFreedBySilence, lesson });
  const teacher = lesson === undefined ? undefined : teacherDrawnFor(lesson);
  const crop = useMediaQuery(FROM_WIDE.replace('@media ', '')) ? 'ground' : 'top';
  const left = players === 0 ? 'empty' : 'here';

  if (players === 0) {
    return (
      <Street
        left={left}
        right="empty"
        line="none"
        mood="wait"
        crop={crop}
        teacher={teacher}
        label={label}
      />
    );
  }

  if (players < 2) {
    return (
      <Street right="empty" line="none" mood="wait" crop={crop} teacher={teacher} label={label} />
    );
  }

  return (
    <Street
      right={seatFreedBySilence ? 'away' : 'here'}
      line="taut"
      mood="wave"
      crop={crop}
      teacher={teacher}
      label={label}
    />
  );
};
