import { signInAnonymously } from 'firebase/auth';
import { addDoc, collection } from 'firebase/firestore';
import type { CrosswordLayout } from 'shared';

import { auth, db } from '../firebase/config';
import { buildRoomDocument, ROOMS_COLLECTION } from './room-document';

/** Everything the caller supplies to open a new room. */
export interface CreateRoomInput {
  /** Layout the owner already reviewed, including the words that were dropped. */
  readonly layout: CrosswordLayout;
  /** Name the owner will be known by — they join their own room as its first player. */
  readonly ownerNickname: string;
}

/**
 * Creates a room in Firestore and puts the owner in it as the first player.
 *
 * Signs the owner in anonymously first: the project has no backend, so the
 * client writes the document itself and the security rules only accept a
 * signed-in author. Anonymous sign-in is idempotent — a browser that already
 * has an anonymous user keeps it, which is what lets the owner come back to
 * the room later (issue #9).
 *
 * @param input - The reviewed crossword layout and the owner's nickname
 * @returns Id of the created room — the part of the invite link players open
 * @throws Error from Firebase when sign-in or the write is rejected, and from
 * `buildRoomDocument` when the layout holds no placed word
 *
 * @example
 * const roomId = await createRoom({ layout, ownerNickname: 'Vik' });
 */
export const createRoom = async ({ layout, ownerNickname }: CreateRoomInput): Promise<string> => {
  const { user } = await signInAnonymously(auth);
  const room = buildRoomDocument({
    ownerId: user.uid,
    ownerNickname,
    layout,
    createdAt: new Date(),
  });

  const created = await addDoc(collection(db, ROOMS_COLLECTION), room);

  return created.id;
};
