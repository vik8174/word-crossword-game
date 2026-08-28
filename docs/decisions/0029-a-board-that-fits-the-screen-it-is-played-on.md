# 0029. A board that fits the screen it is played on

Status: Accepted

Revises the grounds of [0017](0017-desktop-first-while-the-grid-outgrows-a-phone.md).

## Context

[0017](0017-desktop-first-while-the-grid-outgrows-a-phone.md) put the desktop first while the grid outgrew a phone, and it named the problem as **width**: a square was 32 pixels with a 2-pixel gap, so 22 columns were 746 pixels against a phone of 375. [Issue #69](https://github.com/vik8174/word-crossword-game/issues/69) re-measured that with the real generator and made it worse rather than better — twenty words of 13 to 16 letters came out at 43 columns and 1462 pixels, against the 1280 of a typical desktop window — and it found that the narrow board was a `Container maxWidth="sm"` of about 552 pixels rather than the size of anybody's screen. Both records were measuring how far the board runs sideways.

This release measured the other axis, and the answer is that width was the wrong thing to be worried about.

The generator was run a hundred times per list size, on lists with a realistic spread of word lengths:

| list     | columns p50 / p80 / p95 / max | rows p50 |
| -------- | ----------------------------- | -------- |
| 10 words | 18 / 22 / 25 / 30             | 14       |
| 15 words | 21 / 24 / 28 / 30             | 19       |
| 20 words | 22 / 27 / 32 / 36             | 23       |

The number that decides everything below is not in that table but in what happens when the run is repeated with more room: **a run given 880 pixels for the board and a run given 1300 produce the same result.** The board comes out very nearly square — twenty words are 22 columns by 23 rows at the median — and a desktop window is wide and low. Width past a point is bought and not spent; what runs out is height. A board given the whole width of a 1440-pixel window still has only the height left over after everything stacked above and below it, and that is the constraint that was never being measured.

That reframes 0017 rather than contradicting it. Its arithmetic was right and its conclusion — spend the effort on the desktop — is confirmed by this release rather than overturned. What changes is the reason: the desktop is not the target because a phone is too narrow for the board, it is the target because the board needs a screen that is tall enough to be given a fixed height at all, and a phone is the one screen that cannot be given one.

What was considered for the square itself:

- **Keep a fixed square and let the board scroll.** What the game had. It is what put 1074 pixels of page scroll under the worst board and left the player scrolling a page to see a board that was itself scrolling.
- **Measure the window in React and compute a size.** A render that depends on the width of the window: a first frame at the wrong size, a resize listener, and a board that redraws while a letter is being typed into it.
- **A square the browser works out, bounded at both ends.** What is decided below. The board is a CSS container and the side of a square is a `clamp()` over the space that container has along both axes, so nothing measures anything and no render depends on the size of the window.

## Decision

**A square is flexible between a floor of 20 pixels and a ceiling of 44** (`MIN_CELL_SIZE`, `MAX_CELL_SIZE` and `CELL_GAP` in `apps/web/src/components/board-geometry.ts`, which is the only place those numbers are written). The floor is where a letter stops being comfortably readable: below it the board stops shrinking and starts scrolling instead, **in both directions** — sideways alone would cut the bottom off, and a board cut off at the bottom is a board with words nobody can reach. The ceiling is there because a short list on a large screen would otherwise be drawn in squares of sixty or seventy pixels, which reads as a toy rather than as a crossword.

**From a tablet upwards the room is an application rather than a document**: the height of the window, no page scroll, and the board always on screen (`APP_SHELL` and `THREE_ZONES` in `apps/web/src/components/room-layout.ts`, at 768 pixels wide by 600 high, and three zones from 1200). Those are media queries and not a measurement, which is what keeps the first frame from being drawn at the wrong width. Height is asked for as well as width, because width alone would hand the fixed-height layout to a phone turned on its side, where the keyboard leaves nothing over.

**The phone stays a document that scrolls**, and for a stated reason rather than for want of trying: a square a player fills in is an `input` ([0016](0016-the-cursor-lives-in-the-grid.md)), so every move opens a virtual keyboard over half the screen, `100dvh` on iOS Safari is not the height that is visible, and a twenty-word board does not fit a phone at any square size a letter stays readable at.

**Desktop first, from 0017, stands.** This record does not free the phone; it says which measurement the phone is waiting on.

Measured in the browser after [#101](https://github.com/vik8174/word-crossword-game/issues/101), on the worst board there is — 35 columns by 32 rows, from twenty long words:

| viewport | page scroll       | board box | square                  |
| -------- | ----------------- | --------- | ----------------------- |
| 1440×900 | 0                 | 915 × 702 | 20px, fits whole        |
| 834×1112 | 0                 | 787 × 689 | 20px, scrolls down      |
| 375×812  | 313px, a document | 343 × 503 | 20px, scrolls both ways |

Before this release the same board was drawn 537 by 615, under 1074 pixels of page scroll.

## Consequences

- The numbers are here so they are not taken a third time. If the floor or the ceiling moves, this is the arithmetic to redo, and `board-geometry.ts` is the file that holds it — written twice it would drift, and the test that holds the release to its promise would go on asserting a promise the board had stopped making
- 0017's second review condition is still open and still the same one: the game being played by people who did not build it, on the devices they own. The phone is now an accepted shape rather than an unanswered question, but it is the shape that will be reported on first
- Extra width is worth nothing to this board, which is a result rather than an opinion, and it is the reason the room does not simply stretch the board across the window. Two indexes take the space instead, and below 1200 pixels they go under the board rather than beside it, because at 834 a three-column split would leave the board about 500 across — less than it had before the release
- A board that scrolls is now a statement about the list rather than about the layout. Twenty words of 13 to 16 letters reach the floor and scroll; the lists a game is usually played with do not, and the pre-tag checks fix three lists in the repository so that this is looked at with the same three every time ([`../manual-checks.md`](../manual-checks.md))
- Nothing here decides where the movement of this release may happen. That the board is the thing the screen is for is an argument this record supplies and [0030](0030-where-movement-is-allowed.md) spends
