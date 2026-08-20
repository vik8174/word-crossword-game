# 0025. What happens to the seat of a player who left

Status: Accepted

Amends [0022](0022-a-mark-a-player-writes-for-themselves.md).

## Context

A room is played by exactly two ([ADR 0024](0024-two-players-are-the-product-not-the-algorithm.md)), so each of its seats is half the game. What becomes of one when its player disappears was decided across three tickets and now behaves correctly in every case — [#47](https://github.com/vik8174/word-crossword-game/issues/47) gave a lobby seat away, [#49](https://github.com/vik8174/word-crossword-game/issues/49) fixed the size of a room, and [ADR 0022](0022-a-mark-a-player-writes-for-themselves.md) built the marks all of it reads.

What none of them produced is an answer. "What happens if my guest disappears in the middle of a word" is a question a player asks in ten seconds, and answering it meant reading `presence.ts` for the thresholds, `room-access.ts` for who may take a seat, `room-screen.ts` for what a visitor is shown, and two comments in `firestore.rules` for what is actually refused. Four cases that fit in a paragraph did not exist anywhere as four cases — not in the code, and not in a test whose name a person could read.

That is the gap this record closes. Nothing below is a change of behaviour: every case here was already true when it was written down. Only one number moves, and the reason for it is in the last section.

There is a second reason to write it out. Three of the four are held by the security rules and one by the client alone, and the difference decides how much a reader may trust each one. A client-side check is the app agreeing not to ask; a rule is the room refusing. Read case by case in the code, the two look alike.

## Decision

**The policy is four cases, and they are settled by two questions: whether the words have been dealt, and whether the seat is the host's.**

### In a lobby

| The player who left | Their seat                                                                           | Held by                                                                               |
| ------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| **The host**        | kept for as long as the room exists; offered to nobody                               | `keepsTheOwnerIn` in `firestore.rules`, and `abandonedSeatIn` never picking the owner |
| **Their guest**     | freed once their mark is older than the threshold, and taken by whoever arrives next | `SEAT_FREE_AFTER_MS` and `abandonedSeatIn`, in the client                             |

The host's seat is the exception because they are the likeliest to step out — they are off in a messenger sending the very link the room is waiting on — and they alone can start the game, so a room that lost them would have nothing left to do. Nothing is lost by holding it: a room holds two, and the stray tab this was all built for signs in as a UID of its own.

A guest's seat is freed by the client that wants it, in the single write that also fills it, and the rules are not asked to arbitrate — the reasoning is [ADR 0022](0022-a-mark-a-player-writes-for-themselves.md)'s and is not reopened here.

Being shown as away costs a guest nothing. The two thresholds are separate on purpose: a line beside a name is taken back the moment its player writes again, and a seat given away cannot be.

### Once the words have been dealt

| The player who left | Their seat                                                         | Held by                                                 |
| ------------------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| **The host**        | frozen; theirs when they come back                                 | `freezesPlayersOnceDealt` in `firestore.rules`          |
| **Their guest**     | frozen; theirs when they come back, and no newcomer is let into it | the same rule, plus `roomAccessFor` answering `started` |

Neither of these reads a mark at all, and that is the point: **presence decides nothing outside the lobby.** A word is dealt to a UID through `words.<id>.hiddenFromPlayerId` and the win is read from those same fields, so a player taken out of a started game leaves their words hidden from nobody — a crossword that can never be finished, with no way back, since `completed` is terminal and the room cannot be deleted. A newcomer is refused for a second reason as well: every word of a started room is hidden from one of the two it was dealt to, so whoever arrived afterwards would be handed the whole list as words to "explain" ([ADR 0010](0010-letterless-grid-and-private-word-list.md)).

Both are rules rather than client checks, and they have to be: a lobby's roster is any signed-in client's to write, so the freeze is the only thing standing between a started game and a lost player.

The four cases are asserted under these names in `apps/web/src/rooms/seat-policy.test.ts`, which is the client's side of them. What the rules refuse is proved against the emulator in `firestore/rules.test.mjs`: the two frozen seats under the same names as here, and the lobby pair by the narrower tests that were already there.

### The threshold is 60 seconds

`SEAT_FREE_AFTER_MS` was 90 seconds and is now 60 — four missed write periods at `PRESENCE_PERIOD_MS = 15_000`.

Ninety was chosen against the twenty-four hours it replaced, where any number would have been an improvement, and [ADR 0022](0022-a-mark-a-player-writes-for-themselves.md) said as much: the exact value is not precious. What it costs is now visible from the policy above. Holding a seat protects a guest who stepped out; it also leaves the host, whose guest is simply gone, with a full room and nobody to give the seat to. A minute and a half of that is longer than the situation is worth.

**The gap to `AWAY_AFTER_MS = 45_000` remains, and the gap is the decision rather than its width.** Sixty against forty-five still separates the reversible reaction from the irreversible one, which is the whole reason there are two thresholds. What moved is a number, not the reasoning.

`AWAY_AFTER_MS`, `PRESENCE_PERIOD_MS` and `PRESENCE_TICK_MS` are unchanged.

### Two gaps, accepted as limits

Both are known, neither is a defect to be filed, and both are named here so the next reader meets an answer rather than a surprise.

**A host who lost their browser identity is a host the room cannot recognise.** `signInAnonymously` issues a UID per browser profile, so a host who clears their site data, switches profile or opens the link in a private window comes back as somebody else. Their seat is held for a UID no browser can produce any more, and it is held precisely because it is the host's — the one seat nothing frees. The room cannot be started, and it lives out its lifetime waiting. Until there is real sign-in, which [the PRD](https://github.com/vik8174/word-crossword-game/issues/1) rules out for the MVP, this is the host's own to avoid: the browser that made the room is the browser that plays in it.

**A guest who never comes back after the deal leaves a game that cannot end.** The seat is frozen, so nobody replaces them; `completed` is written only when every word of the crossword has been answered, and the words hidden from the missing player cannot be. The one who stayed has no way out of the room and no way to close it. A leave control and an early end to a game are deliberately not part of this record — they are [#73](https://github.com/vik8174/word-crossword-game/issues/73), and they are the answer to this gap rather than a detail of the policy.

### What "the room waits out its lifetime" actually means

It is easy to read the two gaps above as "an abandoned room tidies itself away within the day". That is not what happens, and the difference matters to anyone reasoning about either of them.

**A room's 24 hours are counted from the last write to it, not from the moment a player left.** Every update pushes `expiresAt` another 24 hours out ([ADR 0013](0013-keeping-a-room-alive-on-every-write.md)), a presence mark is an update, and each client writes one every fifteen seconds while it sits in a lobby or a game. So the clock on a stranded room does not start until the last tab on it is closed — the player who stayed, staring at a crossword that will never finish, is themselves the reason the room is still alive.

## Consequences

- The question "what happens to a seat when somebody leaves" has one place to be answered and one place to be checked, in a file whose test names are the answer
- A vanished guest costs the host a minute rather than a minute and a half. Against a guest who really did just step out, the seat is now held for four missed marks instead of six — accepted, since the guest who lost their seat meets the screens that already exist for somebody not in `players`, while the host who cannot re-fill their room has nothing at all
- The freeze on a started game keeps its two consequences: a player who disappears mid-word can always come back to their own game, and the room they left cannot be salvaged by anybody else
- Neither accepted gap is closed here. [#73](https://github.com/vik8174/word-crossword-game/issues/73) is where the second one is answered; the first waits on sign-in, which is not planned
- Nothing in this record changes what the security rules do. Presence thresholds still never reach them, so there remains exactly one number the client and the rules must keep in step by hand — the size of a room — and this policy does not add a second
