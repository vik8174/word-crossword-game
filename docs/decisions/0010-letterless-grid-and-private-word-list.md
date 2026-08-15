# 0010. A letterless grid and a private list of the words a player explains

Status: Accepted

## Context

Assigning words ([issue #6](https://github.com/vik8174/word-crossword-game/issues/6)) is the first moment two players looking at the same room must see different things. Every player fetches the whole document, words in plain text included ([0004](0004-ui-only-word-visibility.md)), so what separates them is drawn entirely by the client — and this ticket has to settle what "drawn" means for the grid itself.

The crossword is what makes this awkward. Words intersect; that is the point of the genre. A word I can see crosses words I have to guess, so rendering its letters in the grid hands me one letter of every word it crosses, before anyone has explained anything. With 10-20 words in a dense grid, a player could work out a good part of their own words from the intersections alone.

Three ways to draw it were considered:

- **(a) Letters for the words I can see, blanks for the ones I cannot.** The familiar crossword look, and the most obvious reading of "show me my words". It is also the one that leaks: a player's own words arrive partly filled in for free, and the more the generator managed to interlock the grid, the more it gives away.
- **(b) A letterless grid plus a private list of the words I explain.** Nothing about my hidden words can be inferred from the grid, because nothing is in it. The cost is that an explainer reads their word from a list and cannot see where it sits in the grid.
- **(c) Letters only in cells that no hidden word passes through.** Keeps some letters without leaking, but produces a patchwork that differs per player, changes shape after every guess, and takes explaining. Complexity bought nothing the game needs.

## Decision

**(b).** The grid holds no letters until a word has been guessed. What a player may see of the words lives beside it, not in it:

- Each player gets the list of the words hidden from someone else — the ones they explain out loud, spelled out in full.
- Of the words hidden from them they get a count and nothing else.
- A guessed word's letters appear in the grid for everyone at once ([issue #7](https://github.com/vik8174/word-crossword-game/issues/7)), so the grid is the shared progress view and stays identical on every screen.
- `wordViewFor` in `apps/web/src/rooms/word-visibility.ts` is the only place that decides what a player may see. Components take its output; nothing that renders for a player reaches into `layout.placedWords` itself.

Starting a game belongs to the owner, from two players up, and `firestore.rules` now enforces both rather than leaving them to the screen: an update that moves a room from `lobby` to `playing` is accepted only from the room's owner and only when at least two players are in.

## Consequences

- Issue #7 inherits a grid cell with two states — empty, or a guessed letter — instead of three, and no per-player divergence to keep in sync while several players type at once
- Issue #8 reads the win from `words` alone, and the grid completes for everyone at the same moment
- An explainer cannot see where their word sits in the grid or what it crosses. Accepted: explaining happens out loud and outside the app, and the word itself is all that takes
- Guessing a word does hand its letters to whoever else crosses it — but only for words the group has already solved together, which is the cooperative progress the game is built on
- Nothing is shown before the deal, so a room in the lobby gives away no word to anyone, including the owner who typed them
- This remains a UI decision, not a security one: the hidden words are still in the document that every client fetched ([0004](0004-ui-only-word-visibility.md) stands)
- The rules can refuse the wrong player starting a game, but cannot check the deal itself — they cannot walk the `words` map — so a hostile client already in a room can still rewrite `hiddenFromPlayerId` while a game runs. The same trust boundary [0009](0009-room-document-schema.md) already accepts, and the same one issue #7 will meet with `guessedByPlayerId`
