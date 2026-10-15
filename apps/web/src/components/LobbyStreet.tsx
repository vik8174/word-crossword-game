import { Street } from './Street';

interface LobbyStreetProps {
  /** The host is alone: one seat has never been taken. */
  readonly waiting: boolean;
  /** Two players in, and the second has been silent so long that the seat is free. */
  readonly seatFreedBySilence: boolean;
}

/**
 * The drawing over the lobby, which says who is in (`lobby` and `lobby/waiting`
 * of the template, lines 940-947), with its three labels:
 *
 * - the host alone: the second balcony empty and the line loose, the neighbour
 *   waiting;
 * - both in: both balconies taken and the line taut, the neighbours waving;
 * - a seat freed by silence: both are still in the room, but the curtains of the
 *   second are drawn (`right="away"`) while the line stays taut.
 *
 * Cropped to the top, and with no teacher: the lesson's lobby is #234's.
 *
 * @param props.waiting - The host is alone
 * @param props.seatFreedBySilence - The second player's seat has been freed by silence
 *
 * @example
 * <LobbyStreet waiting={false} seatFreedBySilence={false} />
 */
export const LobbyStreet = ({ waiting, seatFreedBySilence }: LobbyStreetProps) => {
  if (waiting) {
    return (
      <Street
        right="empty"
        line="loose"
        mood="wait"
        crop="top"
        label="Your balcony, and the one across the street still empty"
      />
    );
  }

  if (seatFreedBySilence) {
    return (
      <Street
        right="away"
        line="taut"
        mood="wave"
        crop="top"
        label="Both balconies taken, the curtains drawn across the street"
      />
    );
  }

  return (
    <Street
      right="here"
      line="taut"
      mood="wave"
      crop="top"
      label="Both balconies taken, the line strung between them"
    />
  );
};
