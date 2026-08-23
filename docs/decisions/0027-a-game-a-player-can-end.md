# 0027. A game a player can end

Status: Accepted

Amends [0025](0025-what-happens-to-the-seat-of-a-player-who-left.md).

## Context

Until now a room had exactly one way out: every word of its crossword answered. [ADR 0012](0012-ending-a-game-from-the-received-state.md) built that ending carefully — it is read off the snapshot rather than inferred from one's own write, so two players answering the last two words in the same second still end the game — and it is the only ending there is.

That leaves a hole [ADR 0025](0025-what-happens-to-the-seat-of-a-player-who-left.md) wrote down and accepted. Once the words are dealt, every seat is frozen: a word is dealt to a UID through `words.<id>.hiddenFromPlayerId` and the win is read from those same fields, so a player taken out of a started game leaves their words hidden from nobody and a crossword nobody can ever finish. The freeze protects the player who steps out for a minute. It also means that a player who never comes back leaves the other one in front of a board that will never fill in, with nothing to press.

And it does not even tidy itself away. A room's 24 hours are counted from the last write to it ([ADR 0013](0013-keeping-a-room-alive-on-every-write.md)), a presence mark is a write, and a client in a lobby or a game writes one every fifteen seconds. So the player who stayed is themselves the reason the room is still alive: the clock does not start until they close the tab on a game they cannot finish.

Half of the machinery for the way out already existed. `RoomClosedEarly` draws a room closed with words unanswered, `closedGridCaption` says what such a board shows, and the security rules already accepted a `completed` written from a game in progress. What was missing was a control that leads there, and the decisions about who may press it and what the room should then say about itself.

## Decision

### Either player may end the game, and it ends it for both

Not the host alone, even though the host alone deals the words out. The player who needs the way out is whoever was left on their own, and after the deal that is as likely to be the guest as the host: the words hidden from the host can be answered by the host and by nobody else, so a host who disappears strands their guest exactly as a guest who disappears strands their host. A control only one of them has would be missing in half the cases it exists for.

There is no way to make it smaller than that. Leaving on one's own is not available once the words are dealt — the security rules refuse to let a player key leave `players`, and they have to, for the reason above — so in a game "I am going" and "this game is over" are the same act. The button therefore names the larger one: **End the game**, never "Leave". A confirmation stands in front of it, because the act cannot be taken back.

The confirmation says one thing and does not branch on whether the other player looks present. Every client marks itself present every fifteen seconds, so that reading can flip while the dialog is open, and a warning that rewrote itself under somebody's finger would be worse than one that claims slightly more than it must. What it says is true either way: this ends the game for both of you, and there is no way back.

The room does not record who ended it, and gains no field for it. The case the control exists for is a player sitting alone, so the person reading the closed room is usually the person who closed it; and when both are there, they say it to each other out loud, this being a game played by two people already talking. A field would also mean widening the list of keys a room document may hold, which the security rules check on every write.

The control lives in a game and nowhere else. A lobby has nothing stuck in it: a guest's seat frees itself after 60 seconds ([ADR 0025](0025-what-happens-to-the-seat-of-a-player-who-left.md)) and a host with nobody to play with simply goes. A room that has already ended has nothing left to write.

### The ending gets a status of its own: `closed`

Writing `completed` over a game nobody finished would put the wrong word in the document. It was tolerable while the state was unreachable — the comment in `RoomClosedEarly` said "Nothing an honest game does produces this" — but this ticket makes it the ordinary outcome of a button, and encoding "walked away from" as "completed" then becomes a lie the room tells about itself for the whole of its 24 hours. There are zero such rooms today, because there was no path to the state, which makes this the cheapest moment there will ever be to split them: after the release, every abandoned game would be a document to migrate.

`RoomStatus` therefore has four values, and `closed` is the fourth. The runtime guard in `room-document.ts` accepts it, and `roomAccessFor` treats both endings alike for a newcomer at the door — a game played to its last word and a game its players ended are one piece of news to somebody who was never in the room.

**No simplification follows, and none was expected.** It is tempting, once there is a status that means "ended early", to reduce `isGameFinished` to a status check. That would be a hole. The security rules cannot walk the `words` map ([ADR 0009](0009-room-document-schema.md)), so they cannot check `completed` against the board, so any client that knows a room id can still write `completed` over a game that was never played — and `isGameFinished` is the only thing standing between that write and the whole word list being read out by `finishedWordsOf`. Both of its consumers keep both halves:

- `word-visibility.ts` — the guard on the reveal, which is the security question
- `room-screen.ts` — the same question about the screen: `completed` over an empty board must show a closed room, not a celebration

So choosing the screen is now: `completed` **and** a full board is `finished`; any other ending is `closed-early`. That is one step more involved than it was, and correctly so.

### Neither ending may become the other

`hasValidStatus` used to spell terminality as `before.status != 'completed'`. It now asks whether the previous status was terminal at all, and if it was, refuses any status but the same one. So `playing → closed` is allowed to either player, and `closed → completed`, `completed → closed` and every reopening are refused.

This is not tidiness. [ADR 0012](0012-ending-a-game-from-the-received-state.md) rests on one sentence — the value does not depend on who wrote it — and that is what makes several clients writing `completed` in the same second harmless. A second possible ending breaks it exactly once: press End in the very second the last answer lands, and one client sees a full board while another has already decided, and the two write different words. Refusing the move settles it without electing anybody: whichever ending arrives first is what happened in this room, and the second client is told no. It is proved against the emulator in `firestore/rules.test.mjs`, in both directions.

The client agrees rather than arbitrates. `awaitsCompletion` already required `status === 'playing'`, so the automatic ending stops of its own accord the moment a room reads `closed` and never retries against it. The ending a player asked for is not retried either: a person decided it, and repeating their decision on their behalf is not the screen's to do.

### An ended game is its own event

`game_closed` is reported beside `game_completed`, carrying the same two counts — how many words the crossword had, how many players were in the room — and nothing else. Folding the two together was rejected: `game_completed` is the measure of whether this game works at all, and a single number that also counted abandoned games would answer nothing. No nickname, no room id and no unredacted text goes into it, which is [ADR 0014](0014-telemetry-without-room-ids.md) and [ADR 0023](0023-a-screen-name-is-text-that-has-been-redacted.md) unchanged.

## Consequences

- The gap [ADR 0025](0025-what-happens-to-the-seat-of-a-player-who-left.md) accepted is closed. A player whose partner never came back has a way out of the room, and it is the same way out whichever of the two of them they are
- It is closed in both halves. `awaitsPresenceFrom` already asked for a mark only in a lobby or a game, so an ended room stops being marked without a line of change — which means `expiresAt` stops moving and the room really does die within the day, rather than living for as long as somebody keeps a tab open on it. That was the second half of the gap, and it is what makes an ending an ending rather than a screen
- A room that ends is described by the word for what happened to it. `closed` and `completed` are two results and the document now holds whichever one is true, at the cost of one more value in the union, one more branch in the screen switch, and one generalised condition in the rules
- The two endings cannot disagree. The race is settled by refusal rather than by ordering, and the loser is told, so no screen ever has to reconcile a room that claims both
- One room reads oddly, and it is the right oddity: an ending that lands in the same second as the last answer leaves a full board under `closed`. The board is complete, but the document says the game was ended, so the closed screen is what is shown and the word list is not spelled out. The alternative — reading the board over the room's own statement of what happened — is the exact reasoning the double check exists to refuse
- `isGameFinished` survives the split with both halves intact in both consumers, and the tests that hold it — a `completed` on an unplayed board revealing nothing, on the screen and in `word-visibility` alike — are the ones that must survive any later refactor of these states
- There is still no way to leave a game without ending it, and none is planned. That limit stays in [`docs/known-limits.md`](../known-limits.md) with its reason: after the deal, freeing a seat without closing the room would leave a crossword nobody can finish
- The closed screen offers no way onward — no button, no link — which is exactly what the finished screen offers. A new game is a new room, and neither ending pretends otherwise
