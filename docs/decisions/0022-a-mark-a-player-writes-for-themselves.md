# 0022. A mark a player writes for themselves

Status: Accepted

## Context

`signInAnonymously` issues a new UID per browser, per profile, per incognito window, so the host who opens their own invite link on their phone — to check it arrived, or because the link opened inside a messenger's webview — is not the host coming back. They are player number two.

Since [#49](https://github.com/vik8174/word-crossword-game/issues/49) took the ceiling to two, that is the whole room. The friend the link was sent to meets a wall, and there is no way out of it: nothing removes a player, `allow delete: if false`, and the room's own 24 hours are the only exit ([#47](https://github.com/vik8174/word-crossword-game/issues/47)).

A leave control does not fix it. The tab that has to go is usually the one nobody can reach — a webview inside an app that has already been closed — so a control that must be pressed on that device fixes only the case that was never the problem.

That leaves the room itself having to notice. It cannot: there is no backend of ours between the players and the database ([ADR 0002](0002-no-dedicated-backend.md)), so nothing holds a connection whose loss could mean anything, and Firestore's own presence pattern is a Realtime Database feature this project deliberately does not have ([ADR 0003](0003-firestore-over-realtime-database.md)).

There is a second, quieter version of the same blindness. Firestore serves a client its own writes from cache, optimistically, so a player whose connection has gone still sees their letters land in the grid and the room exactly as they left it — while the other player explains a word out loud into nothing.

The reasoning behind each decision below was settled by `/grill-me` on 2026-08-18.

## Decision

**Presence is a timestamp each client writes about itself.** Every client rewrites `players.<uid>.lastSeenAt` while it sits in a room; how old that mark has grown is what everybody else reads.

### The field

```ts
interface RoomPlayer<TTimestamp> {
  nickname: string;
  joinedAt: TTimestamp;
  lastSeenAt?: TTimestamp; // rewritten every 15 seconds while in a live room
}
```

**Optional, and read with a fallback to `joinedAt`.** A room lives 24 hours, so rooms written before this shipped are still being played in; refusing them would take a game away mid-word from players who did nothing but keep playing it. `joinedAt` is the last moment such a room can honestly claim anybody was seen.

**Written as the leaf field alone**, never as the player entry it sits in. Rewriting the entry rewrites `joinedAt` with it, and the player list is ordered by exactly that (`playersInJoinOrder`) — a mark written every fifteen seconds would reshuffle the list on every beat.

The security rules do not validate anything inside `players.<uid>` ([ADR 0009](0009-room-document-schema.md)), so the new field costs them nothing.

### The three numbers

|              | Seconds | What it drives                                                        |
| ------------ | ------- | --------------------------------------------------------------------- |
| Write period | 15      | how often a client marks itself                                       |
| Away         | 45      | the line beside a name, and the notice a reader gets about themselves |
| Seat free    | 90      | a lobby seat may be taken, the owner's excepted                       |

Two thresholds off one mark, so the fast reaction never causes the irreversible one. A line beside a name is taken back the moment its player writes again; a seat given away cannot be. People step out of a lobby for a minute at a time — the host is off in a messenger sending the very link the game needs — and mobile browsers throttle timers in a backgrounded tab, so the threshold that costs something is the generous one. Ninety seconds against the previous twenty-four hours is the fix; the exact number is not precious.

### What a stale mark means, and where

| State       | A stale mark means                                                                        |
| ----------- | ----------------------------------------------------------------------------------------- |
| `lobby`     | the seat may be taken by somebody arriving — **except the owner's, which is never freed** |
| `playing`   | a line beside the name, and nothing else, ever                                            |
| `completed` | nothing: no client marks itself in a finished room, so no mark there says anything        |

The difference between the first two rows is load-bearing, and it is enforced rather than agreed. Words are dealt to UIDs through `words.<id>.hiddenFromPlayerId` and the win is read from those same fields, so a player removed mid-game leaves their words hidden from nobody and a crossword that can never be finished — with no way back, since `completed` is terminal and `delete` is refused. **`firestore.rules` therefore freezes the roster outside the lobby**: `hasAll` alongside the `hasOnly` that was already there, so the set of player keys cannot change at all once the words are dealt.

The third row is the consequence of not writing marks in a finished room (below): with nobody marking themselves, every name would go quiet within the minute and the line would say only that the game is over.

### Who decides a seat is free

**The client that wants to join.** Somebody opening the link reads a mark older than 90 seconds and writes themselves into that seat, in the same update that removes it — two writes would take the room through a size the rules refuse, and whichever landed second would be the one turned away. A player already in a room never writes about anybody but themselves.

The rules are not asked to arbitrate, **because they already do not**: the freeze above short-circuits on `before.status == 'lobby'`, so any signed-in client holding the room id can already rewrite a lobby's roster, and everything else about `players` is a size check. That is the trust boundary [ADR 0004](0004-ui-only-word-visibility.md) accepted for this whole app. A rule comparing timestamps would buy no protection against a client that meant harm, while adding a second number to keep in step with the client by hand — the thing [#49](https://github.com/vik8174/word-crossword-game/issues/49) has just finished doing once.

**The owner's seat is never freed.** They are the likeliest to step out, since they are the one sending the link, and they alone can start the game — so a room that loses them has nothing left to do. Nothing is lost by keeping it: a room holds two, and the ghost this decision exists for has a UID of its own.

That one exception _is_ worth a rule, and `firestore.rules` states it: `after.players.keys().hasAll([before.ownerId])`, in every state. It is the opposite kind of check from the thresholds — it asks who the owner is, not how long ago anybody wrote — so it costs no number kept in step with the client by hand, and without it a lobby's roster being anybody's to write means anybody could throw the host out of the room they made.

### A player is told about their own silence

The reader's own mark, in the document the reader is looking at, goes stale exactly when their writes stop arriving — because it _is_ one of those writes. So the same question, asked about the reader, is the whole mechanism: no separate notion of being online, and nothing taken from `navigator.onLine`, which reports a network rather than a database.

**This is why each mark is scheduled only once the one before it has landed**, rather than on a fixed interval. Firestore applies a client's own pending writes to that client's own snapshots immediately, so a timer that fired regardless would keep writing fresh marks into the local cache and the reader would go on seeing themselves as present for as long as the tab was open — the one screen in the room that could never tell. Waiting for each write to be acknowledged means an unreachable database stops the chain, and the reader's own mark ages like everybody else's. It also means the chain resumes by itself when the connection comes back, since the write that was pending finally resolves.

### Marks are written only where somebody is waiting for one

In `lobby` and `playing`, and only by clients the room already holds. A visitor still looking at the nickname form is not in the game and nobody is waiting on them; a finished room is over.

The second half of that is not tidiness. Every write postpones a room by another 24 hours ([ADR 0013](0013-keeping-a-room-alive-on-every-write.md)), so a tab left open on a final screen would keep its room alive for as long as the tab existed, writing into it every fifteen seconds to say so.

### Reading the marks needs a clock of its own

Every other screen in this app is a function of the document that last arrived. This one cannot be: what makes a player away is a write that did **not** happen, and no snapshot carries that — a room whose players have all gone quiet would go on showing them as present precisely because nobody is writing to it. So the player list re-reads the marks every five seconds. The clock lives there rather than at the room screen, so what a tick re-renders is a list of two names and not the grid a game is played on.

### Not decided here

Recognising the same person across two devices, which would dissolve the defect rather than treat it. That needs real sign-in, which the PRD rules out for the MVP.

## Consequences

- The defect is gone: a stray tab costs a room ninety seconds instead of a day, and the friend the link was sent to gets in
- **The TTL policy no longer collects a room while a tab is open on it.** [ADR 0013](0013-keeping-a-room-alive-on-every-write.md) said every write postpones a room because a room being written to is a room being used; that stays true, and a heartbeat is the most direct evidence of it there is. What changes is the reach: "24 hours of inactivity" now means 24 hours with no _tab_ on the room, not 24 hours with nobody doing anything in it. A browser left open on a lobby holds its room until the browser is closed. Accepted knowingly — the room is one document, and the alternative is a client that stops saying it is there while it is there
- Presence is the most frequent write this app makes: one small update per client per fifteen seconds, against a document each client is already subscribed to. Two players in a room for an hour cost about a thousand writes between them, and the reads they cause are the snapshots those clients were receiving anyway
- Two clients could take the same seat within the same second, and both writes would be accepted — the last one wins and the other player is simply not in the room. No worse than the join race the rules already leave open at two, and a game of two has nobody left to race with
- A player whose seat was taken while they were gone comes back to the screens that already exist for somebody who is not in `players`, and their client writes nothing to put them back. A tab that quietly rejoined would push out the very player it had just made room for
- Reconnecting ([#9](https://github.com/vik8174/word-crossword-game/issues/9)) is unchanged: a player still listed in `players` lands straight back in the room with no nickname to type, whatever their mark says
- The rules now hold a room's roster frozen from the deal onwards, which also closes a way of spoiling a game that was open before this ticket and had nothing to do with presence
