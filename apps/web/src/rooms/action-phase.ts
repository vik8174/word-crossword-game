/**
 * How far something the player asked for got.
 *
 * Both writes a room screen offers — entering it and starting its game — stay
 * `submitting` after they succeed: the write comes back through the
 * subscription and replaces the screen, so clearing it would only flicker.
 *
 * Three states rather than an `isSubmitting` flag beside an `error` string, so
 * that submitting-and-failed cannot be expressed at all.
 */
export type ActionPhase =
  | { readonly phase: 'idle' }
  | { readonly phase: 'submitting' }
  | { readonly phase: 'failed'; readonly message: string };

/** Nothing has been asked for yet. */
export const IDLE: ActionPhase = { phase: 'idle' };

/**
 * The message to show for an action that did not go through, if it did not.
 *
 * @param action - How far the action got
 * @returns What to say about it, or `undefined` while there is nothing to say
 *
 * @example
 * failureOf({ phase: 'failed', message: 'Could not start.' }); // 'Could not start.'
 */
export const failureOf = (action: ActionPhase): string | undefined =>
  action.phase === 'failed' ? action.message : undefined;
