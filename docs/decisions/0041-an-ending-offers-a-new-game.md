# 0041. An ending offers a new game

Status: Accepted

Amends [0012](0012-ending-a-game-from-the-received-state.md) and [0027](0027-a-game-a-player-can-end.md), in one consequence each.

## Context

Both endings used to stop. [ADR 0012](0012-ending-a-game-from-the-received-state.md) says of the finished game that "the win screen offers no button that pretends otherwise", and [ADR 0027](0027-a-game-a-player-can-end.md) says that "the closed screen offers no way onward, no button, no link". The reason was honest: a room that has ended is terminal in the security rules, so no button on it could carry on the game, and a button that looked as if it did would have lied.

The template for the endings (`design/templates/state-tree.html`, `finished` and `closed-early`, [#229](https://github.com/vik8174/word-crossword-game/issues/229)) gives each one a "Start a new game" button. It does not pretend to carry on anything. It goes to the page where a new room is made.

## Decision

**Both endings offer "Start a new game", and it goes to `/`.** On Finished it is the loud button, under the card. On Ended early it is the quiet one, because a game that was ended with words unanswered is not an occasion that wants a loud button.

The room itself is unchanged. It is closed for good, nothing on the screen writes to it, and the button is a link away from it, as the one on the unavailable-room notice is (`RoomUnavailableNotice`).

## Consequences

- The consequence of 0012 that said the win screen offers no button, and the one of 0027 that said the closed screen offers no way onward, no longer hold. What they said about the room stays true: a new game is a new room, and the button says so by going to the page that makes one, not by restarting this one.
- Neither ending has a callback, so neither can write. The button is a link and not an action.
- A lesson's teacher has a button of their own on both endings, "Start a new lesson", and it goes to `/create?mode=lesson`, the page that makes a room with "Run a lesson" already chosen ([#236](https://github.com/vik8174/word-crossword-game/issues/236)); `/create` alone, as Home's "Create a game" opens it, still starts on "Play with a friend". A lesson's students keep "Start a new game" to `/`: they did not run the lesson, and a lesson of their own is not what they were offered.
