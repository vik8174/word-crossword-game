# 0015. The words a player explains, written into the grid

Status: Accepted

Supersedes [0010](0010-letterless-grid-and-private-word-list.md). Amends [0011](0011-typing-guesses-into-the-grid.md).

## Context

[0010](0010-letterless-grid-and-private-word-list.md) decided that the grid holds no letters until a word has been answered, and that the words a player explains live in a list beside it. [Issue #41](https://github.com/vik8174/word-crossword-game/issues/41), part of [PRD #32](https://github.com/vik8174/word-crossword-game/issues/32), reverses that.

What has been built since is a list of words with a diagram beside it rather than a crossword. An explainer knows their word but not where it sits, how long it is or what it crosses, so they are explaining into a void — and the one thing a crossword gives a game about words, the interlocking, is the thing the players cannot use.

0010 rejected writing those letters in — its option **(a)** — for a sound reason: words intersect, so a letter of a word I explain is a letter of a word somebody has to guess, and on my own board it is a letter of a word _I_ have to guess. The reasoning was right and the magnitude was never measured.

### The magnitude, measured

Thirty generated grids from a twenty-word list, dealt among each room size. The share of a player's own words — the ones hidden from them — that arrives already written, because a word they explain crosses it:

| Players in the room | Letters of my own words already written |
| ------------------- | --------------------------------------- |
| 2                   | 17.3%                                   |
| 3                   | 22.7%                                   |
| 4                   | 26.0%                                   |

It grows with the room because every word is hidden from exactly one player, so the more players there are, the larger the share of the grid any one of them explains.

**The tail matters more than the average.** The most-covered single word in any run had **67%** of its letters supplied by crossings. That figure is the same at two, three and four players: it follows from how densely the generator interlocks a grid, not from how many people are in the room. A three-letter word arriving with two letters written is, in practice, given away. **No word was ever covered completely** in any run.

Three ways to spend that were considered, and two rejected:

- **Reveal explained letters only where they do not cross a hidden word.** The patchwork 0010 already rejected as its option (c): it differs per player, changes shape after every answer, and has to be explained to anybody looking at it.
- **Bias the deal so a player's own words cross their explained ones less.** Breaks the even split [issue #6](https://github.com/vik8174/word-crossword-game/issues/6) built, and trades a measured cost for an unmeasured one.
- **Ask the generator for looser grids.** Damages the crossword for every player in order to serve its worst word.

## Decision

**Option (a) of 0010 is accepted, as measured.** The words a player explains are written into their grid, in place. No mitigation of the 67% tail is built.

This is a cooperative game for practising vocabulary out loud. A word that arrives free costs one word of play, not the game. What matters is that the number is recorded here rather than rediscovered as a bug in six months.

### The invariant changes shape rather than going away

**Was:** no word of the crossword appears in the rendered document.

**Becomes:** **no word hidden from this viewer appears in the rendered document — and the words they explain do.**

That is narrower, not weaker, and it is asserted the way it is stated: over the whole rendered document, against every word the room hides from the viewer, rather than over named elements or a list of words written into a test.

### `gridViewFor` gains a third source of letters, and nothing else does

`gridViewFor` in `apps/web/src/rooms/word-visibility.ts` remains the one place that decides what a screen may draw. It now shows a square's letter when a word the group has answered runs through it **or** when a word this viewer explains does.

The explained squares are taken from what `wordViewFor` worked out for this viewer, never from `layout.placedWords`. That is what makes the dangerous case structural rather than a matter of care: a player the deal never covered has no word hidden from them, so asking the layout "which words are _not_ hidden from me?" would answer _all of them_ and write the whole crossword out in front of somebody who has to guess none of it. Read through `wordViewFor`, that player is `left-out` and explains nothing.

### A cell says why its letter is there

`GridCellView.letter` stops being `string | null`. A square is one of three things, as separate shapes rather than one shape with a nullable field:

- `{ kind: 'solved', letter }` — a word the group has answered runs through it; the same on every screen
- `{ kind: 'explained', letter }` — a word this viewer explains runs through it; on their screen alone
- `{ kind: 'empty' }` — no letter, and none to lose

`solved` wins where a square is both, which is what makes a word visibly move from "only I can see this" to "the group has this" the moment its guesser answers it.

**The distinction is functional, not decorative.** A player who reads their own word as one the group has already answered stops explaining it, and the game stalls quietly with everybody waiting. So it does not rest on colour: an explained square carries a dashed outline where every other square is solid, its letter is slanted where every other letter is upright, and it says what it is for a reader who sees neither. The same standard the panel already held for answered words.

### A letter written in counts towards the word crossing it

A square that holds a letter is nobody's to type in, whether the group earned it or this player explains the word through it. The letter is right and it is in front of them; asking them to retype it would be asking them to copy what they can already read. This is [0011](0011-typing-guesses-into-the-grid.md)'s rule for solved crossings, applied unchanged — being wrong stays a state rather than an event, and there is no second code path.

### The panel becomes an index

Not "here are your words" — the grid holds those now — but two numbered lists: the words this player explains, and the words they guess. The second replaces the counter that was there, and it is what lets a guesser say _"explain seven across again"_. The numbers are the ones [issue #40](https://github.com/vik8174/word-crossword-game/issues/40) derives from the layout; there is no second numbering.

The panel stays for three reasons: reading a down word out of a grid is slow when the point is to be talking, progress has nowhere else to live, and a screen-reader user rebuilding words square by square has no other way through.

### Using the structure of the crossword to explain a word is allowed

An explainer can now see their word's length, its position and everything it crosses, and may say so: _"your four down, six letters, crosses my apple at the second P."_

A deliberate change to how the game plays, not a side effect of the interface. Forbidding it would be unenforceable — the screen shows it, so players will use it — and intersections are how a crossword hints in the first place.

## Consequences

- The game is a crossword rather than a diagram beside a list. An explainer can talk about where a word sits and what it crosses, which is what [PRD #32](https://github.com/vik8174/word-crossword-game/issues/32) set out to buy
- Between 17.3% and 26.0% of a player's own letters arrive written, and one word in a grid may arrive up to 67% written. Accepted as measured. Should the generator ever be changed, this is the number to measure again
- 0010's promise that the letters are identical on every screen is now spent in full. 0011 spent its wording; this spends its substance. What replaces it is narrower and stated as such: _a player is never shown a letter of a word hidden from them until a word they may see runs through it, or it is answered_
- Conversational difficulty drops, and some pairs will play in coordinates rather than in meanings. Accepted: the alternative is a game whose central object cannot be talked about
- A word hidden from a player can now fill up from crossings without them typing anything at all — explained letters cannot finish one on their own at 67%, but together with answered ones they can. That is behaviour [0011](0011-typing-guesses-into-the-grid.md) already settles: its owner's client writes the answer, and the win condition still reads one field
- A room closed before its crossword was finished still shows each reader the words _they_ were explaining. No leak — those were never theirs to guess — but the notice on that screen says so rather than promising a board it does not show
- This remains a UI decision, not a security one. Every word is still in the document every client fetched ([0004](0004-ui-only-word-visibility.md) stands), and a hostile client in the room can still spoil the game for the room it is in
- Nothing new is written to Firestore. The board a player sees is derived from `layout` and `words`, which were on every screen already, so the document schema ([0009](0009-room-document-schema.md)) and `firestore.rules` are untouched
- [Issue #42](https://github.com/vik8174/word-crossword-game/issues/42) inherits a cell that says what it is, which is what marking an active square and moving a cursor across the grid both need
