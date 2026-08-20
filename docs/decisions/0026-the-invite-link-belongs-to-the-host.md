# 0026. The invite link belongs to the host

Status: Accepted

Amends [0021](0021-one-room-address.md).

## Context

[ADR 0021](0021-one-room-address.md) moved the invite link off `/create` and onto the room screen, above the switch, and decided in one sentence who would see it there:

> **The link is shown to every player, not only the owner.** A guest already has the URL — it is in their address bar, it is how they got there — so hiding it would protect nothing and would cost a branch. Passing an invite on to one more friend is the same act whoever performs it.

Every clause of that is still true except the last one, and the last one carried the decision.

**It rested on a premise that has since expired: that a room could hold one more person.** When 0021 was written a room held four, so a guest passing the link on was filling a seat that existed. [#49](https://github.com/vik8174/word-crossword-game/issues/49) took the ceiling to two, and [ADR 0024](0024-two-players-are-the-product-not-the-algorithm.md) recorded why it can never be anything else: every word is hidden from one of the two players it was dealt to, so a third person has the whole crossword to read and nothing to guess. The number did not merely move — the "one more friend" of 0021's sentence stopped existing.

What the guest is offered now is therefore an act that cannot succeed. They arrive by the link, give a nickname, and the room is full at that instant. The panel above their lobby invites them to pass on a URL that leads whoever receives it to a refusal — and the guest cannot see that, because a room full to a stranger looks exactly like a room to the person inside it.

So this is not a change of taste applied to a settled decision. It is the consequence of a later one, and 0021's reasoning was sound for as long as its premise held.

There is a second thing the naive fix would get wrong. "The room is full" and "there is no seat" are not the same statement: [ADR 0025](0025-what-happens-to-the-seat-of-a-player-who-left.md) settled that a guest's lobby seat is freed once their mark is 60 seconds old, and the room goes on holding two players' entries the whole time. A host whose guest closed the tab has somebody to invite again, and the count of players never said so.

## Decision

**The invite link is shown to the host, and only while the room still has a seat for somebody.**

Two facts have to hold, and neither of them is a new question this record invents:

- **The viewer is the host.** A `lobby` screen already carries both the room and the id of who is reading it, so this is `screen.viewerId === screen.room.ownerId` and nothing more.
- **A seat is free.** This is `hasFreeSeatIn` — the expression `roomAccessFor` has always answered a visitor at the door with, now named and shared instead of copied. A count of players is deliberately not what is asked: a seat freed by a stale mark is free, and a second condition written beside the first would sooner or later disagree with it.

`hasSomebodyToInvite` composes the two over the screen, next to the rest of what `room-screen.ts` decides as a value. A guest is refused by both halves at once — they are not the host, and the room they are in is full precisely because they are in it.

### The price: the link now waits for the first snapshot

0021 put the panel above the switch for a reason it stated plainly, and this record overturns exactly that reason:

> Above the switch it is there while the room is still being read, on the nickname form, and in the lobby, which is exactly as long as a link can still let anyone in.

**Who the reader is cannot be known without the document.** The link is built from the address, but the host is not — the room is the only thing that says who made it. During `connecting` there is no honest answer, and the two ways to guess are not symmetrical: showing the panel would put the link in front of a guest, which is the whole defect being fixed, while withholding it costs the host one snapshot on a subscription that is already open.

So `connecting` shows the panel to nobody. The host sees their link a moment later than they used to; the guest never sees it at all. That trade is the decision, and it is named here rather than discovered later by whoever reads 0021 and finds the code disagreeing with it.

The dependency runs the other way too, and in the host's favour. Because the panel is derived from the document, a seat freed by a mark going stale brings it back by itself — on the next render, which the host's own presence heartbeat guarantees within fifteen seconds. The link is not a fixture of the screen any more; it is there for as long as there is a seat behind it.

### What is unchanged

The panel's own content — the whole link shown and selectable, the copy control, and the honest message when a browser refuses the clipboard — is untouched, and so is where it sits in the markup. It stays above the screen switch: filling a room is not a phase of one. `/create` remains the form 0021 left it as, and no second way to invite anybody was added.

`isOpenToNewPlayers` is replaced rather than kept. Its only caller was this one line, and a predicate left behind unused would be a second answer to a question that now has one.

## Consequences

- A guest is never offered a link that leads to a refusal, and the room they are in is no longer described to them as one that can take somebody else
- For the host the panel becomes a live statement about their room: it is there while a seat is open, it goes when the guest walks in, and it comes back if that guest disappears for a minute — which is the moment they need it again
- "Is there a seat" is one expression in one place, shared by the visitor at the door and the host looking at the panel, so the two cannot drift apart
- The host waits for the first snapshot before they can copy the link. On a connection that never delivers one they see no link at all — where before they would have seen a link into a room that, as far as anybody could tell, was not there
- Nothing here is a protection. The security rules already refuse a third player, and a link passed on by a guest was always going to be turned away at the door; what changes is that the app stops offering an act it knows will fail. `firestore.rules` are untouched
- [ADR 0021](0021-one-room-address.md) keeps its body and gains a status line pointing here. The rest of it stands — one address, the replace in history, the screen chosen as a value, the letterless preview on `/create`
