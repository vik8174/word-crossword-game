import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

/**
 * Storybook's substitute for `src/firebase/services.ts`, aliased in
 * `.storybook/main.ts`.
 *
 * `rooms/room-service.ts` imports `auth` and `db` at module scope, and it is
 * reached from `CreateRoomPage.tsx` even for a story that never submits the
 * form. No story in this project signs a player in or writes to a room
 * (Boundaries: no component changes, so nothing calls `createRoom` from a
 * story) — `auth` and `db` only have to exist so the import resolves.
 */
export const auth = {} as Auth;
export const db = {} as Firestore;
