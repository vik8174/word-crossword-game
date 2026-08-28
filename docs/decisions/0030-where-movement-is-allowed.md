# 0030. Where movement is allowed

Status: Accepted

## Context

This release gives the game a look, and two of its tickets put things in motion: [#93](https://github.com/vik8174/word-crossword-game/issues/93) animates the change from one screen to another, and [#103](https://github.com/vik8174/word-crossword-game/issues/103) puts falling petals behind the app and a greeting at the end of a game.

The reason this is a record rather than a line in either ticket is what the result looks like from outside. The game screen will have no movement on it at all: no petals behind the board, nothing animating a square, a letter, or the highlight. Read without the reasoning, that is indistinguishable from work left unfinished, and the next person or agent to open the project will helpfully finish it. The silence during a game is the decision, and the several rules that protect it are each one line of code away from being written the other way round.

The transitions are not decoration either. Two screens live at one address: the nickname form and the lobby are both `/room/<id>`, which is exactly why the funnel of [0023](0023-a-screen-name-is-text-that-has-been-redacted.md) could not be built out of page views. A player presses Join and the screen simply becomes a different screen, with nothing saying that a state changed rather than a page redrawing.

## Decision

**Petals everywhere except the game.** They fall on the landing page, on `/create`, on the nickname form, in the lobby, and on the screen of a finished game. Behind the board they do not, and the background there is still. This follows [0029](0029-a-board-that-fits-the-screen-it-is-played-on.md) rather than taste: the board is the thing the screen is for, and movement behind a grid is movement in the peripheral vision of somebody who is reading letters and listening to another person talk. The lobby is where movement is worth the most, because that is the one screen where a player is waiting with nothing to do.

**The greeting is the garden coming back, not a firework.** When the last square falls into place the petals that were absent all game start thickly and thin out into the calm background. The board stays on screen, filled in. It is not a celebration of a win over anybody: this game is cooperative in its data and not merely in its mood — `GameCompletedPanel` deliberately carries no score, because `guessedByPlayerId` does not always name the person who earned the word, a word completed by its intersections being written to the player it was hidden from ([0011](0011-typing-guesses-into-the-grid.md)).

**The greeting keys off the transition, never off mounting the screen.** `RoomScreen.kind === 'finished'` is true forever — the room is terminal, and both the client and the security rules keep it that way ([0027](0027-a-game-a-player-can-end.md)) — so an animation that plays when the finished screen mounts plays again on every reload and again in a tab opened an hour later. It fires on `playing → finished` within one session. Somebody who opens a completed room in a fresh tab is shown a calm result, and that is correct rather than a gap.

**`closed-early` gets neither the petals nor the greeting.** There are two ending screens and they are not the same thing: `finished` is a board that was filled in, `closed-early` is a game somebody ended with words still unanswered ([0027](0027-a-game-a-player-can-end.md)). A celebration after a partner walked out mid-game is a taunt.

**`prefers-reduced-motion` switches movement off, and does not slow it down.** Off means no petals at all and an instant screen change. It is not an in-app option, and there is no setting that overrides it: somebody who turned animation off in their operating system has already answered the question.

**Movement sleeps in a tab nobody is looking at.** A guest opens the invite link and goes to make tea; a `requestAnimationFrame` running behind that tab warms their phone for the length of a game.

**A transition is keyed on which variant of `RoomScreen` is showing, not on a render.** Every client rewrites its presence mark every fifteen seconds ([0022](0022-a-mark-a-player-writes-for-themselves.md)) and every such write is a snapshot for everybody, so a two-player room redraws roughly every seven seconds for the whole game. An animation hanging off the render flickers all game, and it flickers nowhere a developer would see it: on a local machine with no second player there are no snapshots at all.

**The petal layer does not travel with the screens.** The transition of [#93](https://github.com/vik8174/word-crossword-game/issues/93) slides; the background stays still underneath the slide, or the whole garden moves sideways with it, and it fades out on the way into the game. Being a background it also cannot be `position: fixed` inside an animated subtree, since a `transform` makes a containing block of its own.

**No particle library.** The petals are about a hundred lines against a canvas and zero new dependencies. This is not the case that `three.js` was refused over — that was 155 KB gzipped on top of a bundle that is still one chunk — and it does not become that case by being convenient.

## Consequences

- The game screen having no movement is a decision recorded here. It is not to be "fixed", and a ticket proposing to animate a square, a letter or the highlight is answered by this record and by [0029](0029-a-board-that-fits-the-screen-it-is-played-on.md)
- The silence carries the greeting. Because there is no movement during a game, the petals coming back at the end are themselves the announcement, and no separate celebration has to be built
- A cost accepted knowingly: somebody who leaves the tab and comes back after the game ended sees a static result, the greeting having been asleep when it would have played. Nothing is done about it on purpose — the alternative is a background tab that never stops drawing
- Keying on the variant rather than on the render is the requirement most easily missed and most expensive to find later, because a machine with one player never reproduces the failure
- The animation is carried out in [#93](https://github.com/vik8174/word-crossword-game/issues/93) and [#103](https://github.com/vik8174/word-crossword-game/issues/103) rather than here: this record fixes the decisions, and the code and the manual checks that go with them arrive with those tickets. The checklist has a section standing empty for them ([`../manual-checks.md`](../manual-checks.md))
- Whatever renders the petals has to be reachable by the reduced-motion query and by the visibility of the document, which rules out a purely decorative implementation nothing can switch off
