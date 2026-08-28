# 0017. Desktop first, while the grid outgrows a phone

Status: Accepted, with the first review condition below spent rather than met, the widths in its body superseded by measurement, and its grounds revised by [0029](0029-a-board-that-fits-the-screen-it-is-played-on.md)

Refines [0016](0016-the-cursor-lives-in-the-grid.md).

[Issue #31](https://github.com/vik8174/word-crossword-game/issues/31) is closed, and it did settle the largest room a game may have: exactly two players, in `MAX_PLAYERS` in `apps/web/src/rooms/room-access.ts`. That number is not the ceiling this record was waiting on. The grid is generated in `apps/web/src/pages/CreateRoomPage.tsx` from the owner's word list, at the moment the room is created and before anyone has joined, so its width follows `MAX_WORDS = 20` in `packages/shared/src/word-list-validator/types.ts` and nothing else. Room size and grid width were never the same question — a room capped at two players produces the same 22 columns as a room of four. The first condition is therefore closed without being satisfied, and the phone now waits on the second alone: the game being played by people who did not build it, on the devices they own. A room cap can still become the answer, but only by capping words rather than players.

[Issue #69](https://github.com/vik8174/word-crossword-game/issues/69) raised `MAX_WORD_LENGTH` from 12 to 16, and on the way it measured what this record had only estimated. The 22 columns and 746 pixels below were an illustration rather than a run of the generator: twenty words at the old twelve-letter ceiling already produce 25 columns and 850 pixels, so the board was wider than its own record said before anything changed. At sixteen letters the worst case — twenty words of 13 to 16 letters — is 43 columns and 1462 pixels, against the 1280 of a typical desktop window. A realistic mixed list, ten long words and ten ordinary ones, is 29 columns and 986 pixels and still fits. Those widths are the board's rather than the screen's: on the room page the grid sits inside a `Container maxWidth="sm"` (`apps/web/src/pages/RoomPage.tsx:176`), which gives it about 552 pixels, and the horizontal scroll lives in the `overflowX: 'auto'` wrapped around it (`apps/web/src/components/CrosswordGrid.tsx:211`) — so a desktop was already scrolling at the old ceiling, 25 columns and 850 pixels against that same 552, and what sixteen letters change is how far that scroll runs rather than whether there is one. The horizontal scroll this record accepted as the phone's problem is therefore the desktop's too, and already was; what the new ceiling adds is a worst case that outgrows even the window, and not only the container it is drawn in. Nothing above is withdrawn and the arithmetic in the Consequences is the same arithmetic, run on the real generator instead of by hand; the decision to spend effort on the desktop stands, and so does the first condition being spent rather than met. What changes is that the second review condition — the game being played by people who did not build it, on the devices they own — now has a second way to fire: not only a phone the grid never fitted, but a desktop it can outgrow.

[0029](0029-a-board-that-fits-the-screen-it-is-played-on.md) revises what this record rests on without withdrawing what it decided. Desktop first still holds, and this release confirms it. What no longer holds is the axis: everything below measures how far the board runs sideways, and the release measured that a board given 880 pixels and a board given 1300 come out the same, because a crossword is very nearly square while a desktop window is wide and low. Width past a point buys nothing and height is what runs out. The square is no longer 32 pixels either — it is a `clamp()` between 20 and 44 that the browser works out from the space the board has — so the arithmetic below is superseded a second time, by a size that is not a constant at all. The phone is left where this record left it, and the second review condition is still the one to watch.

## Context

The game has been built on the assumption that it is played on a phone. [0016](0016-the-cursor-lives-in-the-grid.md) keeps a square this player types into as an `input` for exactly that reason — "a phone opens its keyboard for an input and for nothing else, and this game is meant to be played on a phone" — and [issue #42](https://github.com/vik8174/word-crossword-game/issues/42) argued for reaching a word from the panel on the same grounds.

The assumption has outrun the board. A square is 32 pixels with a 2-pixel gap, so a grid of 17 columns is 576 pixels across and one of 22 is 746. A phone is 375. Between a third and a half of the crossword is off screen at any moment, behind a horizontal scroll.

[Issue #42](https://github.com/vik8174/word-crossword-game/issues/42) did what could be done without touching the board: tapping an entry in the panel takes the player to a word, so a named word can be found without hunting. That makes the grid navigable on a phone. It does not make it fit, and 0016 says so in as many words rather than leaving it implied.

What was considered for making it fit:

- **Smaller squares.** 20 pixels across 22 columns is still 484, and a letter that size is not comfortably readable — the cost is paid by every player to serve the widest grid.
- **Larger squares.** Refused already by [PRD #32](https://github.com/vik8174/word-crossword-game/issues/32): bigger squares widen a grid that is the wrong width to begin with.
- **Zoom and pan, or drawing only the neighbourhood of the active word.** Both are real answers, and both are a piece of work in their own right rather than a tidy-up.
- **Capping how large a room may be, so the grid cannot grow this wide.** Not a display change at all — it is a question about the shape of a game, and it belongs to [issue #31](https://github.com/vik8174/word-crossword-game/issues/31), which is about room size and a crossword preview.

## Decision

**The desktop is the target while this is unresolved.** The phone is a known open problem, recorded here rather than carried as an unstated intention.

This is a decision about where effort goes, not a promise about where the game runs. It is written down because 0016 reads as though the phone were settled, and the next person building on it would otherwise inherit a premise that no longer holds.

**What it does not undo:** the squares of a player's own words stay `input` elements. They cost the desktop nothing, they are what makes the board typeable on a phone at all, and reversing that would have to be reversed again. The same goes for reaching a word from the panel — it earns its place on any screen.

**Which way the answer will come is deliberately left open.** Whether the phone is served by a different way of drawing the board or by a room that cannot produce a board this wide is not decided here, because the second possibility is [issue #31](https://github.com/vik8174/word-crossword-game/issues/31)'s to answer. Choosing a display technique now would answer a question that has not been asked yet.

**Reviewed when either becomes true:** #31 settles the largest room a game may have — the ceiling on the width of a grid is the number this decision is waiting on — or the game is played by people who are not the ones who built it, on the devices they own, and the phone stops being a hypothesis.

## Consequences

- 0016's reasoning about the phone should be read as the reason a shape was kept, not as a claim that the phone is handled. The `input` squares and the panel taps stand; "meant to be played on a phone" is an intention this record puts on hold
- The measurements are here so they are not taken twice: 32-pixel squares, 2-pixel gaps, 576 pixels at 17 columns and 746 at 22, against a 375-pixel phone. If the square size changes, this is the arithmetic to redo
- A grid that is playable but does not fit is now a stated limitation rather than a defect. Nobody should file it again, and nobody should be surprised by it
- [Issue #31](https://github.com/vik8174/word-crossword-game/issues/31) inherits an input it did not have: the width of the board is a consequence of the room size it is about to decide, and it now has the numbers
- Nothing in the code changes with this record. It is a decision about attention, and the only thing it moves is what the next reader believes about the target
