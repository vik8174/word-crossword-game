import { MIN_PLAYERS, wordAssignmentRefusal } from 'shared';
import { describe, expect, it } from 'vitest';

import { lobbyStatusMessage } from './lobby-status';

/** A crossword long enough that only the number of players can stand in the way. */
const WORD_COUNT = 12;

const messageFor = (isOwner: boolean, playerCount: number, wordCount = WORD_COUNT): string =>
  lobbyStatusMessage({ isOwner, playerCount, wordCount });

/** Anything that tells a player this room is short of something. */
const SAYS_SOMETHING_IS_MISSING = /needs \d+ more|cannot start/i;

describe('lobbyStatusMessage', () => {
  describe('to the owner, while the game cannot start yet', () => {
    it('says how many players are still missing, and how to get them in', () => {
      const message = messageFor(true, MIN_PLAYERS - 1);

      expect(message).toMatch(/needs 1 more\b/);
      expect(message).toMatch(/share the room link/i);
    });

    it('leaves starting the game with them rather than with somebody else', () => {
      expect(messageFor(true, MIN_PLAYERS - 1)).toMatch(/you can start it/i);
    });
  });

  describe('to the owner, once the game can start', () => {
    it('says the game can start now', () => {
      expect(messageFor(true, MIN_PLAYERS)).toMatch(/can start now/i);
    });

    it('does not tell them the room is waiting for anybody', () => {
      const message = messageFor(true, MIN_PLAYERS);

      expect(message).toMatch(/nobody else is needed/i);
      expect(message).not.toMatch(/wait/i);
      expect(message).not.toMatch(SAYS_SOMETHING_IS_MISSING);
    });
  });

  describe('to a guest, while the game cannot start yet', () => {
    it('says how many players are still missing', () => {
      expect(messageFor(false, MIN_PLAYERS - 1)).toMatch(/needs 1 more\b/);
    });

    it('says who will start the game, so the wait has a reason', () => {
      expect(messageFor(false, MIN_PLAYERS - 1)).toMatch(/the host starts the game/i);
    });

    it('does not offer them a start they cannot make', () => {
      expect(messageFor(false, MIN_PLAYERS - 1)).not.toMatch(/you can start/i);
    });
  });

  describe('to a guest, once the game can start', () => {
    it('says that the people a game needs are already in', () => {
      const message = messageFor(false, MIN_PLAYERS);

      expect(message).toMatch(/everybody a game needs is here/i);
      expect(message).not.toMatch(SAYS_SOMETHING_IS_MISSING);
    });

    it('says the host is the one who starts it', () => {
      expect(messageFor(false, MIN_PLAYERS)).toMatch(/the host starts it/i);
    });
  });

  describe('when the crossword is shorter than the room', () => {
    it('tells the owner what to do about it instead of pointing at the door', () => {
      const message = messageFor(true, 4, 3);

      expect(message).toMatch(/3 words and the room holds 4 players/);
      expect(message).toMatch(/longer word list/i);
      expect(message).not.toMatch(/needs \d+ more/i);
    });

    it('tells a guest that no arrival of theirs will fix it', () => {
      const message = messageFor(false, 4, 3);

      expect(message).toMatch(/the host cannot start this game/i);
      expect(message).not.toMatch(/needs \d+ more/i);
    });
  });

  describe("the template's words", () => {
    it('counts the crossword in words, and says one word as one word', () => {
      expect(messageFor(true, 2, 1)).toBe(
        'This crossword holds 1 word and the room holds 2 players, so somebody would have nothing to guess. This game cannot start. Create a new room from a longer word list.',
      );
      expect(messageFor(false, 4, 3)).toBe(
        'This crossword holds 3 words and the room holds 4 players, so somebody would have nothing to guess. The host cannot start this game; ask for a link to a new one.',
      );
    });

    it('uses no em dash anywhere', () => {
      for (const isOwner of [true, false]) {
        for (const [playerCount, wordCount] of [
          [1, 12],
          [2, 12],
          [2, 1],
        ] as const) {
          expect(messageFor(isOwner, playerCount, wordCount)).not.toContain('—');
        }
      }
    });
  });

  // The defect this module exists for is a screen that says one thing while the
  // button does another, so the two are held to one answer: the message claims
  // something is missing exactly when the deal would be refused.
  it.each([
    { playerCount: 1, wordCount: 12 },
    { playerCount: 2, wordCount: 12 },
    { playerCount: 3, wordCount: 12 },
    { playerCount: 4, wordCount: 12 },
    { playerCount: 4, wordCount: 4 },
    { playerCount: 4, wordCount: 3 },
    { playerCount: 1, wordCount: 1 },
  ])('agrees with wordAssignmentRefusal for $playerCount players, $wordCount words', (size) => {
    const canBeDealt = wordAssignmentRefusal(size) === null;

    for (const isOwner of [true, false]) {
      expect(SAYS_SOMETHING_IS_MISSING.test(lobbyStatusMessage({ ...size, isOwner }))).toBe(
        !canBeDealt,
      );
    }
  });
});
