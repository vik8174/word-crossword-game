import { FirebaseError } from 'firebase/app';

/**
 * Telling the two ways a Firebase call fails apart, in one place.
 *
 * "The rules would not allow this" and "the database could not be reached" are
 * different facts about the world, and a player needs different things from
 * each: one of them is news about the room, the other is news about the wire.
 * The SDK reports both as the same class of error and separates them only by a
 * code, so this module is where the code is read — once, by name — instead of
 * a string literal appearing in whichever component happened to need it.
 */

/**
 * Firestore's code for a write `firestore.rules` turned down.
 *
 * The only code that means the server understood the write perfectly well and
 * said no. Everything else the SDK can report — `unavailable`, `deadline-exceeded`,
 * a failed sign-in — is a call that never got an answer.
 */
const REFUSED_BY_RULES = 'permission-denied';

/**
 * Whether this failure is the security rules refusing, rather than an outage.
 *
 * Named after the fact and not after the exception: what a caller acts on is
 * that the write was turned down, which is why nothing above this module has
 * to know that Firebase reports it as a `FirebaseError` carrying a code.
 *
 * Anything that is not a Firebase failure at all counts as not a refusal —
 * this answers one question and does not classify the rest.
 *
 * @param error - Whatever a `catch` around a Firebase call received
 * @returns `true` when the rules refused the call, `false` for every other failure
 *
 * @example
 * wasRefusedByRules(new FirebaseError('permission-denied', '...')); // true
 */
export const wasRefusedByRules = (error: unknown): boolean =>
  error instanceof FirebaseError && error.code === REFUSED_BY_RULES;
