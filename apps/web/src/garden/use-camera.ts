import useMediaQuery from '@mui/material/useMediaQuery';
import { useEffect, useMemo, useRef } from 'react';

import { APP_SHELL } from '../components/room-layout';
import { REDUCED_MOTION_QUERY } from '../components/screen-shift';
import { CAMERA_MS, isSamePlace, screenOpacity, travelled } from './camera';
import type { Location } from './locations';

/**
 * The camera as everything drawn through it sees it: where it is this instant,
 * how much of the interface is showing, and a way to be told that either has
 * changed.
 *
 * It is asked rather than handed down, and that is deliberate. A location that
 * travelled as a prop would be sixty renders of the whole application a second
 * for the length of every journey — which is the one cost this ticket cannot
 * pay, since the frames it would spend are the frames the movement is made of.
 * Nothing here is state; a frame is a canvas repainted and one style set, and
 * React is not told about any of it.
 */
export interface Camera {
  /** Where the window is standing this instant. */
  readonly at: () => Location;
  /** How much of the app is showing this instant, 0 to 1. */
  readonly screenOpacity: () => number;
  /**
   * Draw again whenever what the camera sees has changed.
   *
   * Called on every frame of a journey, and once for a place that changed with
   * no journey between — a phone, or a reader who has turned movement off.
   *
   * @param draw - What to do with the new view
   * @returns The way to stop being told
   */
  readonly onFrame: (draw: () => void) => () => void;
}

/**
 * The one camera, pointed at the place the app says it should be.
 *
 * Two readers get no camera at all, and they get it in the same way — the
 * places change and nothing travels between them:
 *
 * - **A phone.** The camera is a picture of a place being approached, and the
 *   frame is anchored to the window's height ({@link frameFor}), so a phone
 *   sees a narrow slice of it. A slice of a journey is not a shorter journey,
 *   it is a stripe of green sliding past, and it is a second of it on the
 *   device least able to spare the frames. What counts as a phone is the same
 *   question the room already answers about itself ({@link APP_SHELL}), asked
 *   once in one place rather than twice with two answers.
 * - **Somebody who turned animation off in their operating system.** Off is
 *   off: not a shorter journey and not a gentler one. There is no setting in
 *   this app that overrides it and there is not meant to be
 *   (`docs/decisions/0030-where-movement-is-allowed.md`).
 *
 * @param target - The place the app is standing in now
 * @returns The camera, as anything drawn through it may ask
 *
 * @example
 * const camera = useCamera(location);
 * <SceneLayer camera={camera} />
 */
export const useCamera = (target: Location): Camera => {
  const isStill = useMediaQuery(REDUCED_MOTION_QUERY);
  const isRoomEnough = useMediaQuery(APP_SHELL);
  const hasCamera = isRoomEnough && !isStill;

  // The view between frames. Held rather than rendered for the reason in
  // {@link Camera}: this changes sixty times a second and no change of it is a
  // change to anything React draws.
  const live = useRef(target);
  const showing = useRef(1);
  const watchers = useRef(new Set<() => void>());

  const camera = useMemo<Camera>(
    () => ({
      at: () => live.current,
      screenOpacity: () => showing.current,
      onFrame: (draw) => {
        watchers.current.add(draw);

        return () => {
          watchers.current.delete(draw);
        };
      },
    }),
    [],
  );

  useEffect(() => {
    const tell = () => {
      for (const draw of watchers.current) {
        draw();
      }
    };

    const arrive = () => {
      live.current = target;
      showing.current = 1;
      tell();
    };

    // Nowhere to go. A game ending is the case this is here for: the hall and
    // the hall at the end of a game are one place, so the camera stays at the
    // table and the cloth is the whole of the event ({@link isSamePlace}).
    if (!hasCamera || isSamePlace(live.current, target)) {
      arrive();

      return undefined;
    }

    const from = live.current;
    let started: number | null = null;
    let frame = 0;

    const step = (now: number) => {
      started ??= now;

      const time = Math.min((now - started) / CAMERA_MS, 1);

      live.current = travelled(from, target, time);
      showing.current = screenOpacity(time);
      tell();

      if (time < 1) {
        frame = window.requestAnimationFrame(step);

        return;
      }

      // Landed exactly, rather than a thousandth short of it: every frame after
      // this one is painted from the place itself, and a place is a value that
      // other things are worked out from.
      arrive();
    };

    frame = window.requestAnimationFrame(step);

    return () => window.cancelAnimationFrame(frame);
  }, [hasCamera, target]);

  return camera;
};
