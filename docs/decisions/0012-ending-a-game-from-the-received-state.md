# 0012. Ending a game from the received state

Status: Accepted

## Context

The win condition ([issue #8](https://github.com/vik8174/word-crossword-game/issues/8)) is the last piece of the game loop: when every word of the crossword has been answered, the room must say so and every screen must show it.

The obvious way to write it is as part of the answer that finishes the grid. A client checks a word, sees that nothing else is open, and sends `words.wN.guessedByPlayerId` and `status: 'completed'` in one update. One write, no extra round trip, and the security rules already accept it.

It does not work. Two players answer the last two words within the same second. Each of them is looking at the room as it stood before the other's answer arrived, and each sees one word still open — somebody else's. So neither writes `completed`. Both answers land, every screen fills in, and the room stays in `playing` for good. Nothing failed: the two clients are healthy, the writes are correct, and yet the game cannot end. Nobody was last at the moment they had to decide.

The room document is the only thing that knows the whole board, and it knows it only after both writes have landed — which is to say, in the snapshot that comes back, not in the one that was read.

A second question came with the ticket. [PR #25](https://github.com/vik8174/word-crossword-game/pull/25) had folded `playing` and `completed` into one `started` state in `roomAccessFor`, because a newcomer opening the link is refused for the same reason either way, and a second state would have had to be carried through the security rules as well. Issue #8 asks that somebody arriving after the end sees that the game is over.

## Decision

### Completion is read off the snapshot, never inferred from one's own write

`awaitsCompletion(room)` in `apps/web/src/rooms/room-completion.ts` asks one question about the room that arrived: is its status `playing` and does every word of `layout.placedWords` name who answered it. Whoever sees that writes `status: 'completed'` and nothing else.

Every client in the room runs this check on every snapshot, and there is no attempt to elect one of them to do it:

- The write is idempotent. The value does not depend on who sends it or when, so two of them arriving together is not a conflict — the second overwrites the first with the same byte.
- It is a single field, in the pattern [0009](0009-room-document-schema.md) chose the document shape for, so it cannot lose a neighbouring `words.wN.guessedByPlayerId`.
- Each screen sends it at most once, guarded by a ref in `useGameCompletion`, so the redundancy costs one write per player and no more. A refused write releases the guard, and the next snapshot tries again — a room stuck full and `playing` is a game nobody can finish.

The cost is a second round trip: the last answer lands, comes back, and only then is the game closed. Firestore's local snapshot fires before the server has acknowledged anything, so in practice the winning client sees its own full board immediately and the others a moment later.

Nothing about this is enforceable in `firestore.rules`: the rules cannot walk the `words` map to check that the grid really is full ([0004](0004-ui-only-word-visibility.md), [0009](0009-room-document-schema.md)). Any player can therefore end a game early, exactly as any player could already mark any word answered by anyone. The same trust boundary, unchanged.

### A finished game is told apart from a running one, in the client only

`roomAccessFor` gains `finished` beside `started`. A newcomer opening the link to a completed room is told the game is over rather than that it has begun; the door is shut either way, but "come back later" is not true of a room that has nothing left to come back to.

This revisits the reasoning of PR #25, and only half of it survives. The reason for refusal really is the same — a latecomer would be handed the whole word list. What does not survive is treating the two as one message to a person: "this game has already begun" tells somebody who has just clicked a link to wait for something that already happened.

The split is in the client and stays there. The rules go on refusing both with the one condition that a started room takes no new player, and learn nothing about the difference.

A player who is already in the room is unaffected: the check for membership comes first, so reopening the link after the end gives them their finished game, not a refusal.

### What unlocks the word list is the board, not the status

`status` is the first field in this project that could reveal words, and it is a field the rules cannot verify: they cannot walk the `words` map, so a client that knows a room id can write `completed` over a room whose game was never dealt out. A screen that spelled the crossword out on the strength of that alone would hand over the whole word list on request.

So the reveal asks `isGameFinished(room)` — the status **and** an answer recorded against every word of `layout.placedWords`. `finishedWordsOf` is guarded by it inside `word-visibility.ts`, and the board component asks the same question before rendering the win screen. Two questions, kept apart, because they are genuinely different:

- **Is this room closed?** `status === 'completed'`. Terminal in the rules, so the room is done with regardless of its grid: no more prompting anybody to explain or type, and newcomers are turned away with a notice that claims no more than that.
- **Was this crossword finished?** The board itself. Only this unlocks the word list and the celebration.

They come apart only in a room somebody closed early, and then the players are told exactly that and shown no unanswered word. From inside the app there is no way to tell a strange game from a spoiled one, and the honest reading is the one that gives nothing away.

### The win screen reports the room's result, not anyone's score

The finished screen shows the completed grid, the crossword's full word list — no word is a secret once every one of them really is in the grid — and a line saying the room finished it together.

It deliberately shows no per-player tally. `guessedByPlayerId` is not a reliable record of who typed what: a word whose crossings filled it in entirely is recorded against the player it was hidden from, because otherwise it could never be closed at all ([0011](0011-typing-guesses-into-the-grid.md)). A table built on that field would be wrong most often in the densest, most enjoyable grids, and the game is cooperative — there is no score to keep.

## Consequences

- The game can be played from the first word to the last and it ends: this closes the loop that issues #3-#8 have been building
- Two players answering the last two words in the same second end the game correctly, and so does one player answering both. There is no ordering of answers, and no failure of one client, that leaves a full grid in `playing` — provided at least one client is still connected. Nobody is watching the room from outside; a game whose players all close the tab at the exact moment it finishes stays open until the TTL collects it, and nothing on any screen was left unfinished
- A finished game costs one extra write per player in the room, up to four. At a room's lifetime scale this is nothing
- The end of the game arrives one round trip after the last answer, so there is a visible beat between the grid filling in and the win screen appearing. It is the same beat on every screen, which is what the ticket asked for
- Any client in the room can end the game early by writing `completed`, and the rules cannot tell that write from an honest one. Accepted, as [0004](0004-ui-only-word-visibility.md) accepted the larger version of the same thing
- `completed` is a terminal state in the rules, so this is not a step that can be taken back. There is no "play again" in the room — a new game is a new room, and the win screen offers no button that pretends otherwise
- `finishedWordsOf` is the one place a word hidden from the reader may be spelled out to them, and it is guarded inside `word-visibility.ts` rather than by its caller, keeping that module the single answer to what a player may see ([0011](0011-typing-guesses-into-the-grid.md))
- Any client can still close a room early, and that costs the room its game. What it does not buy is the word list: writing `completed` over a room that was never played reveals nothing, because the reveal is on the board and the board is the part a client cannot fake without doing the work of answering every word — which is the same as playing the game
