/**
 * The name this browser last played under, kept for the next game (issue #75).
 *
 * A player who plays twice types the same name twice, there being no accounts
 * to hold it — so it is held by the browser instead, in the profile's own
 * storage, which is the only place that survives a reload and does not travel
 * in a link. The name is offered back into the field it came from and goes
 * nowhere else: never into an analytics event, never into a room this player is
 * not in (ADR 0023).
 *
 * What comes back out is treated as anything from outside the app is. A stored
 * name the nickname rules would refuse — one kept before the rules were what
 * they are, or one put there by hand — is read as no name at all, so it can
 * never fill a field the submit button then refuses to act on. That filter
 * lives here rather than in the two forms that read it: a form asks for the
 * remembered name and is answered with a usable one or with nothing.
 */

import { storageFor } from '../storage/local-storage';
import { isValidNickname, normalizeNickname } from './nickname';

/** Where the name lives, in the key naming already used by the traffic mark. */
const STORAGE_KEY = 'word-crossword-game:nickname';

/** A browser that cannot keep a name is played as before, and says so once. */
const inStorage = storageFor('Nickname');

/**
 * The name to offer a player who has played here before.
 *
 * @returns The remembered name, or `''` when there is none worth offering
 *
 * @example
 * const [nickname, setNickname] = useState(readRememberedNickname);
 */
export const readRememberedNickname = (): string => {
  const remembered = inStorage(
    'reading the remembered nickname',
    (store) => store.getItem(STORAGE_KEY),
    null,
  );

  if (remembered === null) {
    return '';
  }

  const nickname = normalizeNickname(remembered);

  return isValidNickname(nickname) ? nickname : '';
};

/**
 * Remembers the name a game was really played under.
 *
 * Called once a room has been created or joined, rather than as the name is
 * typed: what is worth offering back is a name somebody played under, not one
 * that was typed and thought better of. The name given is the one that went
 * into the room, so the two cannot say different things — and it is stored as
 * it stands, since {@link readRememberedNickname} is the one place deciding
 * whether a stored value is usable, the length limit included.
 *
 * @param nickname - The normalized name that was written into the room
 */
export const rememberNickname = (nickname: string): void =>
  inStorage(
    'remembering the nickname',
    (store) => {
      store.setItem(STORAGE_KEY, nickname);
    },
    undefined,
  );
