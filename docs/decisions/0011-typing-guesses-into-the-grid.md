# 0011. Typing guesses into the grid

Status: Accepted, amended by [0015](0015-explained-words-in-the-grid.md)

Amends [0010](0010-letterless-grid-and-private-word-list.md).

[0015](0015-explained-words-in-the-grid.md) overturns two things below: "the grid diverges in what it accepts, never in what it shows", and "an explainer still cannot see where their word sits". Everything else here stands — in particular the rule that a word is answered when its squares are full and spell it, which 0015 applies unchanged to the letters it writes in.

## Context

Entering guesses ([issue #7](https://github.com/vik8174/word-crossword-game/issues/7)) is the ticket that closes the game loop, and it is the first one that has to put something _into_ the grid rather than merely draw it.

[0010](0010-letterless-grid-and-private-word-list.md) settled that the grid holds no letters until a word has been guessed, and said in as many words that it therefore "stays identical on every screen". That is no longer true the moment a player types: the squares of the words hidden from me become boxes I fill in, and the squares of everybody else's words do not. The grid diverges per player again — not in the way 0010 rejected, but it diverges.

Three questions had to be answered before any of it could be built, and none of them is reversible cheaply:

- **What does a component that draws the grid get to know?** Until now it took `row` and `col` off each cell and never touched `letter`. To take input it has to know which squares belong to which of my hidden words — and that is exactly one careless field access away from rendering the whole crossword, since `layout.cells[].letter` and `layout.placedWords[].word` sit in the same document every client fetched ([0004](0004-ui-only-word-visibility.md)).
- **What do intersections do?** Words cross. A solved word fills squares of unsolved ones, so part of a word I am still guessing arrives filled in without me. Does that count towards the answer, and what happens when it fills the word completely?
- **Does an explainer now get to see where their word sits?** 0010 said no. The input squares change the arithmetic behind that answer.

## Decision

### The grid diverges in what it accepts, never in what it shows

Every screen shows the same letters — those of the words the group has solved, and no others. What differs per player is only which squares take typing: the squares of the words hidden from them. 0010's substance survives; only its wording about an identical grid does not.

### `wordViewFor` is extended, not bypassed

`apps/web/src/rooms/word-visibility.ts` remains the single place that decides what a player may see, and now also produces the board:

- `gridViewFor(room, viewerId)` returns every lettered square with its letter **only when a solved word runs through it**, and `null` otherwise.
- A word a player has to guess leaves that module as `{ id, orientation, cells, isSolved, accepts }` — coordinates and an `accepts(guess): boolean` closure. There is no `word` field. The spelling stays inside the closure, so a caller can ask whether some letters are right but has nothing to render by accident.
- Everything downstream — the grid component, the entry hook — takes that output and nothing else. Neither imports `layout`.

This is what keeps the leak structural rather than a matter of discipline: rendering a word a player must guess would require inventing a field that does not exist.

### A word is answered when its squares are full and spell it

One rule, and it does not care where a letter came from:

- **Letters from intersections count.** A square filled by somebody else's solved answer already holds the right letter; treating it as blank would mean asking a player to retype what is in front of them.
- **A word its crossings finished is answered by the player it was hidden from.** Their client is the one holding that word as its own, so it is the one that writes `guessedByPlayerId`. Any other answer leaves such a word permanently open — nobody could ever type into a word with no empty square — and the win condition ([issue #8](https://github.com/vik8174/word-crossword-game/issues/8)) reads exactly this field, so the game would become unwinnable on a grid dense enough to produce one.
- **Being wrong is a state, not an event.** A word whose squares are full and do not spell it is refused for as long as that is true, whichever letter completed it. So a word that fills up wrongly through a crossing is refused on the same terms as one typed in wrongly, with no second code path. It is shown as refused, then its typed letters are withdrawn — the ones that arrived from solved words are not the guesser's to lose. Attempts are not counted or limited.

### Where the cursor goes is a property of the player, not of the square

Two words hidden from the **same** player can cross, and with ten words between two players that happens in most games. The shared square then belongs to both of them equally, and there is no reading of the board that says which way the next letter should go — that depends on which word its owner is filling in.

So the word being filled is held as state of its own, and it is the only piece of state in the entry layer that is about a person rather than about the board:

- Moving onto a square the word being filled already covers keeps that word. Typing therefore carries straight on through a crossing instead of turning down the other word, which is the whole point.
- Moving onto a square it does not cover takes up a word through the new square — the across one where there is a choice, the classic crossword default.
- Clicking a square the cursor is already on swaps to the other word through it, as classic crosswords do. The space bar does the same thing, so the swap is not a mouse-only gesture; a space is not a letter and had nothing else to do.
- The word being filled is drawn differently from the player's other squares, so which way the next letter will go is on the screen rather than worked out.

Every square of a word can be reached without the swap — two crossing words share exactly one square, and a word is at least three long — so nothing is unreachable if a player never discovers the gesture.

### An explainer still cannot see where their word sits

0010's answer stands, and for the reason it gave: explaining happens out loud, and the word itself is all that takes. What has changed is that it is now partly inferable — a player can see which squares are theirs, and in a two-player room the remaining squares are, by elimination, the words they explain. That is accepted. Position gives away no letter, and the alternative is a highlight that must be kept in step with the deal for no gain the game asks for.

### The check stays on the client

The answer travels in the document every client fetched, so there is nobody else to ask, and `firestore.rules` cannot walk the `words` map to verify one ([0004](0004-ui-only-word-visibility.md), [0009](0009-room-document-schema.md)). `checkGuess(input, answer)` in `packages/shared` compares the two with the edges trimmed and letter case dropped, and nothing inside the word touched.

## Consequences

- The game is playable end to end from this ticket on: two players can fill a crossword between them. Only the win screen is missing (issue #8)
- Issue #8 reads the win from `words` alone, exactly as 0010 promised, and every word of a finished grid does carry a `guessedByPlayerId` — including the ones the crossword solved by itself
- A player learns the length, shape and intersections of the words hidden from them, where 0010 gave them only a count. Unavoidable: there is nowhere to type otherwise, and it is what any crossword shows. No letter follows from it
- The refusal of a wrong answer is local. Nothing about it is written down, so nobody else sees another player struggling — and no wrong answer can cost the room anything
- Which word is being filled is the only thing on this screen that a second player's actions cannot change, and it never reaches Firestore. Checking an answer stays independent of it: a word is answered when its squares are full, whichever way its owner happened to be typing at the time
- The swap gesture has to be told to the player, because a crossword square gives no sign that two words run through it. It is said once, and only to a player who actually has a crossing of their own
- Two players answering different words within the same second still do not collide: each write is one nested field (`words.<id>.guessedByPlayerId`), the pattern [0009](0009-room-document-schema.md) chose the `words` map for
- A write the database refuses leaves the word open on the client that made it, so it is offered again on the next update rather than being lost silently. A write merely delayed by the network is Firestore's own problem and it retries
- Everything a hostile client could already do it can still do: the words are in the document, and a client in the room can mark any word answered by anyone. The same trust boundary [0004](0004-ui-only-word-visibility.md) accepted, unchanged, and no security rule added here would narrow it
