# 0016. The cursor lives in the grid, not in the DOM

Status: Accepted

Refines [0011](0011-typing-guesses-into-the-grid.md).

## Context

[Issue #42](https://github.com/vik8174/word-crossword-game/issues/42) is the last of [PRD #32](https://github.com/vik8174/word-crossword-game/issues/32): the crossword becomes playable from the keyboard, and a word becomes reachable from its entry in the panel.

What [issue #7](https://github.com/vik8174/word-crossword-game/issues/7) built is typing that runs along a word, and a click or a space bar that swaps between two crossing words of the player's own. All of it navigates by calling `.focus()` on real `input` elements, and it reads `document.activeElement` to tell a first click from a second. Three things are missing, and they are not three separate jobs:

- **Arrow keys.** They move across the grid — that is what an arrow key is — and the squares of other people's words are on that grid.
- **A mark on the square the next letter will land in.** Today that square is distinguished by the browser's focus ring alone, while what is highlighted is the whole active _word_.
- **A way to reach a word from the panel.** For twenty words the grid runs about 17 columns; a phone is 375 pixels wide, so half the board is off screen and the numbers in the grid are there to _locate_ a word once somebody names it.

The obstacle is the same one in all three cases. A square of somebody else's word is a box, not an input: there is nothing there to focus, nothing to type into, and nothing the browser would carry a cursor through. As long as "where the player is" means "which element has focus", the cursor cannot cross the board, cannot be drawn apart from the focus ring, and cannot be put anywhere by a button somewhere else on the screen.

## Decision

### The cursor is state of the grid, and the browser's focus follows it

Where the next letter will land is held in `apps/web/src/rooms/use-grid-cursor.ts` as a square of the board — a position, not an element. The grid draws it and moves it; nothing asks the DOM where the player is.

It is deliberately **not** kept together with the word being filled in (`use-guess-entry.ts`, which 0011 established). They are two axes: a square can be under the cursor and be nobody's to type in, and the word being filled then simply holds. Folding them into one piece of state would mean inventing a fourth vocabulary for what a square is, on top of the three the grid already has.

**The focus still moves, and that is not a leftover.** A cursor that lived only in state would be silent: a player using a screen reader would be told nothing when they moved, and no existing test would notice, because everything drawn would be correct. So the grid keeps the browser's focus on the square the cursor is on — the square puts the focus on itself as it becomes the cursor — and every square, whoever's word runs through it, carries a label saying where it is, what it holds and whether it is this player's to fill. Moving the cursor is therefore heard as well as seen.

This makes the board **one stop for the Tab key** rather than one per square: the cursor square is reachable by Tab, every other square is not (`tabindex="-1"`). Twenty words are about eighty inputs, and tabbing past the grid was eighty presses.

### A square this player types into stays an `input`

A phone opens its keyboard for an input and for nothing else, and this game is meant to be played on a phone while the players talk. So the squares of this player's own open words remain `input` elements; every other square is a box that can be moved onto, read, and not typed in. Turning the whole grid into boxes with a key handler would have been simpler and would have made the game unplayable on the device it is for — invisibly, since nothing about it shows on a desktop.

### Where the cursor goes, refining 0011

0011 settled that moving onto a square the word being filled already covers keeps that word, and that moving onto a square it does not cover takes up a word through the new square, across first where there is a choice. That stands. Arrows add the cases it never had to answer:

- **A perpendicular arrow takes the word running that way**, where this player has one through the square it arrives at. Otherwise the cursor moves and the direction holds. This is what keeps the cursor and the next letter together: press down while filling an across word, and if the across word stayed active the letter after the next one lands beside the cursor rather than below it — the defect [PR #26](https://github.com/vik8174/word-crossword-game/pull/26) already fixed once, arriving from the other side.
- **A square where this player has no word at all** — somebody else's, or one already answered. The cursor goes there, and **the word being filled holds**. Nothing is dropped: the player is passing through, and a direction that reset itself wherever they wandered would make the next letter depend on the route rather than on the word. There is nothing to type there until they move back onto a square of their own.
- **Squares the crossword does not use are stepped over, not stopped at.** A generated grid is mostly holes; a cursor that stuck in the first one would leave half the board reachable by mouse alone.
- **Clicking a square the cursor is already on, and the space bar, still swap without moving.** What "already on" means is now the cursor rather than `document.activeElement`, which is the same gesture read from the thing that decides it.

### Backspace walks back the way typing walks forward

A backspace clears the letter in the square the cursor is in, or — when that square is already empty — steps back along the word being filled and clears there. It skips exactly the squares typing skips going forward: a square holding a letter that was written in, whether the group answered it or this player explains the word through it, is stepped over and never cleared. Those letters are not this player's to lose, and 0011 already refused to let them be typed over.

### A word is reached from the panel by where it runs, never by what it says

Every entry in the panel becomes a button. Tapping one hands the grid the word's **location** — its squares and its orientation, and nothing else. That is safe for both halves of the panel for the reason 0011 gave: where a word sits is drawn in the outlines of the squares already, and no spelling crosses the boundary.

- A word this player **guesses** is reached at its first square that is still open, ready for a letter.
- A word this player **explains** is reached at its first square, and stays nobody's to type in. This is not a special case in the code: every square of an explained word already holds a letter, and a square holding a letter is nobody's to type in. The general rule produces the right answer, so there is no second path that could let a player type into a word they can already read.

The request is the value arriving rather than a word id being set: tapping the same entry a second time hands over a second value, which is what lets a player tap a word, wander off across the grid, and tap it again to come back.

### The active square is marked by shape, not by another shade

The word being filled keeps its tint. The square the next letter will land in carries a ring drawn inside it — a different kind of mark, not a stronger version of the same one, because "which word" and "which square" are two facts a player reads at once. It is drawn from the cursor rather than from `:focus`, so it stays on the board when the focus is elsewhere.

## Consequences

- The crossword is playable from the keyboard end to end: arrows across the whole board, a perpendicular arrow that turns the corner, a backspace that walks back, and a square that says where the next letter is going. Nothing needs the mouse
- Every square of the grid is now labelled and focusable, where before only the player's own squares were. A screen-reader user can read the board square by square instead of hearing the letters of other people's words as bare text, and the grid is one Tab stop instead of eighty
- The letters of other people's words are read out where they are — which they already were, as text on the screen. No word hidden from the reader is among them: that is [0015](0015-explained-words-in-the-grid.md)'s invariant and it is untouched here
- `document.activeElement` is no longer consulted anywhere. The one gesture that read it — a second click on the same square — now reads the cursor, and is testable without focus
- Focus moving in a layout effect is the one place the DOM and the state can drift. It is a single line in one component, and it is asserted: the tests check which element is focused after every move rather than which handler ran
- The grid keeps two pieces of state about the player rather than one — the word being filled and the cursor. They are separate on purpose, and it is the second thing on this screen that Firestore never hears about. Nothing new is written to the document; the schema ([0009](0009-room-document-schema.md)) and `firestore.rules` are untouched
- Nothing here makes the grid fit a phone. It is still wider than the screen — reaching a word from the panel is what this ticket does about that, and enlarging the squares is refused for the reason PRD #32 gives: bigger squares widen a grid that is already too wide
