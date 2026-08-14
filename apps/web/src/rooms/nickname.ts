/**
 * Nickname rules, shared by room creation and by joining a room (issue #5).
 *
 * A nickname is the only identity a player has — there are no accounts — so the
 * rules stay deliberately permissive: any script, any letters, just something
 * non-empty that fits on a player list.
 */

/** Longest nickname a player list can show without truncation. */
export const MAX_NICKNAME_LENGTH = 20;

/**
 * Trims a nickname and collapses inner runs of whitespace.
 *
 * @param rawNickname - What the player typed
 * @returns The nickname as it would be stored
 */
export const normalizeNickname = (rawNickname: string): string =>
  rawNickname.trim().replace(/\s+/g, ' ');

/**
 * Whether a typed nickname can be stored as is.
 *
 * @param rawNickname - What the player typed
 * @returns `true` when it is non-empty and no longer than {@link MAX_NICKNAME_LENGTH}
 */
export const isValidNickname = (rawNickname: string): boolean => {
  const nickname = normalizeNickname(rawNickname);

  return nickname.length > 0 && nickname.length <= MAX_NICKNAME_LENGTH;
};
