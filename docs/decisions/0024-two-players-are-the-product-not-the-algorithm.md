# 0024. Two players are the product, not the algorithm

Status: Accepted

## Context

[Issue #10](https://github.com/vik8174/word-crossword-game/issues/10) held the work of lifting a room to three and four players, and several comments in the code pointed at it as the change that would reword them. It is closed, and closed as not planned. Two is the size this game is played at, and not because the rest is still queued.

The reason is not technical, so no amount of implementation would move it. Every word in a room is hidden from exactly one player and visible to all the others, who explain it out loud ([ADR 0010](0010-letterless-grid-and-private-word-list.md)). Between two people that arrangement is a conversation: whichever word is on the table, one of them is guessing it and the other is explaining it, and both are busy for the whole game. Bring in a third, and for every word one person guesses, one explains and one watches a word they can already read being guessed by somebody else. The third person is not a third player; they are an audience. Making room for them would take a different rule, not a larger number, and that is a different game — considered and set aside on the grill for [PRD #31](https://github.com/vik8174/word-crossword-game/issues/31).

What the code did not say clearly is that "this product is played by two" and "the deal is written for two" are two claims, and only the first is true.

`assignWords` in `packages/shared/src/word-assignment` deals to any number of players from two upwards: it shuffles the seating, spreads the words evenly across it, and shuffles the result. Its tests run that over rooms of two, three and four. Read beside a closed #10, all of it looks like scaffolding for a cancelled feature, and the obvious tidy-up is to specialise it to two and delete the remainder. This record exists so that the tidy-up meets a written answer instead of having this conversation again.

## Decision

**The product is two players. That is settled, not deferred**, and the constant naming it now says so. `MAX_PLAYERS` in `apps/web/src/rooms/room-access.ts` is `PLAYERS_PER_GAME`: a maximum implies a range beneath it, and there is no range — a room of one is not a smaller game, it is no game, since there is nobody to explain a hidden word. The lobby already told players the truth ("A game is played by exactly 2 people"); the constant behind that sentence now agrees with it.

**`word-assignment` stays general for any n ≥ 2, its tests on three and four players included.**

The generality is not held back for a feature. It is the shape of the rule. What this game runs on is "a word is hidden from exactly one player, and the rest explain it" — a sentence about one and the rest, not a sentence about two. Specialised to two, the module would be that sentence's coincidence rather than that sentence, and the next reader would have to reconstruct the reason a deal works this way out of code that no longer holds it. Written for n, the module is an executable statement of the rule, and it costs what it costs to read and nothing else: the caller does not pay for it, because `room-service` passes whatever ids the room has, and what a room has is two.

The tests on three and four players are part of that rather than leftovers of it. They are what makes "one and the rest" checkable at all. With two players, "everybody is left at least one word to guess" and "nobody guesses more than one word above anyone else" are nearly free — an implementation that dealt alternate words and one that dealt them by a rule nobody intended would both pass. Three and four are the sizes at which the even spread has something to say and the spare word has somewhere to go.

**The boundary between the two levels runs between the packages: `packages/shared` knows the rule, `apps/web` knows the size.**

That is why `MIN_PLAYERS = 2` in `packages/shared/src/word-assignment/types.ts` and `PLAYERS_PER_GAME = 2` in `apps/web/src/rooms/room-access.ts` are two constants and not one, despite being the same number. The first is the floor of the rule — a hidden word needs somebody left to explain it — and it is true of any room the deal is ever asked about. The second is a fact about this product, and it belongs where the product is assembled. They agree today by coincidence rather than by derivation, and either could move without making the other false. Folding them together would state a relationship that does not exist, and would put a rule of the game in the hands of whoever next changes the size of a room.

## Consequences

- The `assignWords` generality has a written reason. A proposal to simplify it to two players is answered by this record rather than by whoever happens to remember the argument
- **What a third player would actually cost, if the rule ever made room for one:** `PLAYERS_PER_GAME` in `room-access.ts`, the `players.size() <= 2` literal in `hasRoomForPlayers` (`firestore.rules`) that is paired to it by hand, and the sentence in the lobby that names the size. Three edits, all of them in `apps/web` and the rules. Nothing in `packages/shared/src/word-assignment` would move, which is the whole point of leaving it as it is
- The pairing between the client constant and the rules literal is unchanged and still manual, because rules cannot import TypeScript. It is also still the only gate that holds: `joinRoom` writes `players.<uid>` without re-reading the room, so a client stopping at a size the rules had not stopped at would leave the seats between the two numbers to a race ([issue #49](https://github.com/vik8174/word-crossword-game/issues/49))
- A rejected draft — the owner declaring the number of players when they create the room, set aside on the #31 grill and never entered in this directory — left one diagnosis worth carrying: **with a ceiling above the floor, a lobby cannot tell "everybody is here" from "one more is coming"**. Two players do not answer that question, they remove it. Whoever raises the ceiling inherits it unanswered
- [ADR 0017](0017-desktop-first-while-the-grid-outgrows-a-phone.md) names this constant by its former name, `MAX_PLAYERS`, in the note added when #31 closed. Its reasoning is untouched — room size and grid width were never the same question — and the pointer is corrected here rather than edited into a record of what was decided at the time
- Nothing a player can see changes with this record. It renames one constant, retires the promises three comments were making about a ceiling nobody is going to lift, and writes down a boundary the code was already keeping ([issue #66](https://github.com/vik8174/word-crossword-game/issues/66))
