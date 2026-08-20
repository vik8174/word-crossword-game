# 0021. One room address, and the lobby that lives at it

Status: Accepted, amended by [0026](0026-the-invite-link-belongs-to-the-host.md)

[0026](0026-the-invite-link-belongs-to-the-host.md) overturns one line below — "the link is shown to every player, not only the owner" — and the reason it gave for putting the panel above the switch. The premise expired rather than the reasoning failing: passing an invite on was the same act whoever performed it only while a room could hold one more person, and [0024](0024-two-players-are-the-product-not-the-algorithm.md) settled that it cannot. The link now belongs to the host, and only while a seat is free, which means it waits for the first snapshot instead of being on the screen while the room is still being read. Everything else here stands, the panel's place above the switch included.

Unlike [0001](0001-record-architecture-decisions.md)–[0012](0012-ending-a-game-from-the-received-state.md), this record was written before the code it describes. What [#48](https://github.com/vik8174/word-crossword-game/issues/48) builds is the address itself: creation ends inside the room, and the invite link lives on the room screen. The crossword preview on `/create` and the lobby without a grid are decided here and still to be built.

## Context

The room screen already draws three different things from one document — a lobby, a game, a finished game — and which one a player sees follows `status` and whether they are in `players`. What does **not** live there is the invite link: it is shown once, on `/create`, on a panel that replaces the word-list form after the room is written.

That leaves the person who created the room in a place none of the others are. They hold a URL they have to paste into the address bar by hand to reach their own game ([#27](https://github.com/vik8174/word-crossword-game/issues/27)), and they are the only player who never sees the room at the room's own address.

**This record reverses the reasoning that put them there.** `RoomCreatedPanel` was written to say that nothing should send the owner into their own room, because the link is usually shared before its owner walks in — so the invitation stayed on the screen and entering was left as a link to click. What that reading missed is that the two are not a choice: the invitation can be _on_ the room screen, where every player sees it, and then walking in costs the owner nothing. What it costs to stay out is a room held in component state, which a reload destroys along with the twenty words that built it — a defect, not a courtesy.

Growing the created-room panel into a waiting room — a player list, readiness, a start control — is the obvious next step, and it is the point at which that split stops being an inconvenience:

- Two lobbies would exist, one on `/create` for the owner and one on `/room/<id>` for everybody else, showing the same room in two implementations.
- The owner's lobby would live in component state. A reload of `/create` knows nothing about the room that was just created, so the owner would lose the waiting room while the guests kept theirs.
- The owner is a player. Every other screen in this app is a function of the room document; theirs would be a function of what happened to be in memory.

The word "navigate" also has to be pinned down, because two of the three transitions people describe do not exist. When the game starts, nobody moves: every player is already subscribed to the room, and the screen follows the document into `playing`. The same is true of the game ending.

## Decision

**A room has one address, `/room/<id>`, and everything about that room happens there.**

The set of routes does not change: `/`, `/create`, `/room/:roomId`, and the catch-all behind them.

### Moving between them

| From         | On                               | To           | History     |
| ------------ | -------------------------------- | ------------ | ----------- |
| `/`          | **Create a game**                | `/create`    | push        |
| `/create`    | the room is written to Firestore | `/room/<id>` | **replace** |
| `/room/<id>` | a guest submits a nickname       | — stays      | —           |
| `/room/<id>` | the owner starts the game        | — stays      | —           |
| `/room/<id>` | the last word is answered        | — stays      | —           |

The replace is the part that is easy to get wrong. Pushing would leave a filled-in word list one Back away, and going back to it invites creating a second room by accident — a room the others were never sent to. Replacing means Back from a room leads out of the app's flow, to `/`.

The three transitions that stay put are not an omission. There is nowhere to navigate: the players are at the room's address already, and the document tells their screens what to be. This is also what makes a reload safe at every point of a game — the screen is derived, never remembered.

### What `/room/<id>` renders

| Viewer           | Room                             | Screen                      |
| ---------------- | -------------------------------- | --------------------------- |
| in `players`     | `lobby`                          | The lobby — see below       |
| in `players`     | `playing`                        | The board                   |
| in `players`     | `completed`, every word answered | The finished game           |
| in `players`     | `completed`, words still open    | Closed-room notice          |
| not in `players` | `lobby`, under four players      | Nickname form               |
| not in `players` | `lobby`, four players            | Room-full notice            |
| not in `players` | `playing`                        | Game-already-started notice |
| not in `players` | `completed`                      | Room-closed notice          |
| anyone           | past `expiresAt`                 | Expired notice              |

> The two "four players" rows read **two** since [#49](https://github.com/vik8174/word-crossword-game/issues/49): a room fills at two, so the nickname form is what a visitor gets while one seat is open, and the room-full notice is what the third one gets. Which screen appears when is unchanged; only the number that separates them moved.

All of it exists today except the invitation itself. The link and its copy control move off `/create` onto the room screen, and they sit **above the switch** rather than inside any one of its screens: the link is built from the address and nothing else, so putting it inside the lobby would make a player wait for the first snapshot before they could invite anybody — worse than what it replaces. Above the switch it is there while the room is still being read, on the nickname form, and in the lobby, which is exactly as long as a link can still let anyone in. Once the words are dealt out it goes: sharing it then only sends a friend to a refusal. `/create` is left as the form it was.

### What the lobby holds

The invitation above it, the list of players who are in, and — for the owner — the control that starts the game. **Not the crossword.** The grid is what the game is played on; the lobby is where a room fills up, and showing the board to people who cannot touch it yet only blurs which of the two they are looking at.

**The link is shown to every player, not only the owner.** A guest already has the URL — it is in their address bar, it is how they got there — so hiding it would protect nothing and would cost a branch. Passing an invite on to one more friend is the same act whoever performs it.

**Being in the room is the whole signal.** There is no readiness to declare: a player who opened the link and gave a nickname is in, and the owner starts when the list looks right to them. A readiness step would mostly repeat what one sentence on the call already does, and the case it would genuinely help — somebody arriving in the instant between the owner reading the room and writing the deal — is already handled, as `left-out`, by [0011](0011-typing-guesses-into-the-grid.md).

Because every player in that list is there on the same terms, the list is the status. A per-player label would read the same on every row and say nothing; it earns its place when there is a second thing it could say.

### The crossword is settled on `/create`, before the room exists

Taking the grid out of the lobby takes away the only place it could be looked at before a game, and the deal that follows a start cannot be taken back. So the looking moves to where it can still change something: `/create` shows the generated crossword and the owner accepts it or asks for another.

The generator makes this nearly free. It "explores placements at random, so the same words can produce different grids" — asking again is one more call with the same words, and no room has been written yet, so nothing is undone and nobody else has seen anything.

This also collapses a fork that exists today. The creation page currently confirms only when some words did not fit, and otherwise writes the room the moment the form is submitted — two paths through the same step. With a preview there is one: generate, look, then **Try another** or **Create room**. What `UnplacedWordsNotice` says belongs in that preview rather than beside it, since a fresh layout can place a different set of words and the leftovers are half of what the owner is judging.

**The preview shows no letters.** What is being judged is how many words fit and how well they interlock, and letters add little to either. They would cost more than they are worth: a component that renders `layout.cells[].letter` is precisely what [0004](0004-ui-only-word-visibility.md), [0010](0010-letterless-grid-and-private-word-list.md) and [0011](0011-typing-guesses-into-the-grid.md) keep out of this app, and one living in the codebase is one waiting to be reused on a screen where it gives a game away. The words are listed beside the grid instead — placed and unplaced — which the owner wrote and already knows.

For the same reason the preview is not the game's grid with a flag on it. It takes a bare `CrosswordLayout`; the room's grid goes on taking a `GridView`, which carries no letter that has not been earned. Two components, and the one that could leak does not exist.

### One address, three screens

A room having one address does not make it one screen. `RoomBoard` is currently a single component that decides between a lobby, a game and a finished game with a handful of flags, and it holds the lobby's status line and start control beside the grid and the guessing. That was proportionate while the lobby was three lines.

It stops being proportionate here. The lobby is about to hold the invite link and a declared number of players, while the grid gains numbering, per-player letters and keyboard entry — at which point one component changes for three unrelated reasons: how a room fills up, how a game is played, and how it ends. The waiting room and the game are different screens that happen to share a URL.

So the choice of screen becomes a value rather than markup. A pure module composes what `useRoomConnection`, `roomAccessFor` and `isGameFinished` already know and returns a discriminated union — connecting, unavailable, join, lobby, playing, finished, closed-early — and the room page is an exhaustive switch over it. Each phase is a component owning only its own writes: the lobby knows nothing of the grid, and the finished screen takes no callbacks because it has none to take. Which screen is shown is derived exactly as it is today: no route, no flag held anywhere, nothing a reload could lose.

This is the pattern the app already uses three times — `RoomConnection`, `PlayerWordView`, `RoomAccess`. Reading a phase as flags in `RoomBoard` is the one place it is not followed, and it reintroduces at the render layer the shape [0009](0009-room-document-schema.md) rejected for the document: one field with three values, not a set of booleans whose illegal combinations can be expressed.

Two things follow that are worth naming rather than discovering. Different phases want different page chrome — a lobby is narrow, a fifteen-square grid is not — and that belongs to the screens themselves, not to the page around them. And a funnel loses what routes would have given it for free: with every room redacted to one path, telemetry cannot tell a room that stalled in the lobby from one played to the end. The answer is an event on entering each screen, with the numeric parameters `GameEventParams` already restricts telemetry to, not an address.

### What would overturn this

One thing, and it is testable: a screen that stops being a pure function of (document, viewer). Tabs inside the lobby, leaving the finished screen and returning while the room stays `completed`, or "play again" as a second game within one room would each put something in the address that the document does not hold — and a phase segment would arrive with it, honestly. Bundle size is not such a trigger: `React.lazy` splits a component as readily as a route.

The case for phase routes was argued properly before this was settled, and its best form is worth recording. `/room/<id>` must work forever, so it could never become the route of a game in progress — it could only become an index route whose one job is to redirect away from itself, making the product's address a page that exists to be left. Meanwhile the phase would live in both the URL and the document, with the document authoritative, so every route would need a guard reading the document to redirect: the document-driven switch stays and a synchroniser is added on top. And because a phase changes when _other people_ write, that synchroniser would call `navigate` from a subscription callback — history entries nobody made, a Back button that leads to a lobby which no longer exists.

### Not decided here

Whether the owner declares an expected number of players when creating the room, and what that would do to the deal and to the word-list validation, is still open and belongs to its own record.

## Consequences

- [#27](https://github.com/vik8174/word-crossword-game/issues/27) stops being a defect to fix and becomes a property of the flow: the owner does not enter their room, they are already in it
- `CreateRoomPage` loses its `created` phase, and with it the last screen this app held in component state. `RoomCreatedPanel` is retired: what it carried — the whole link shown and selectable, the copy control, and an honest message when a browser refuses the clipboard — becomes `RoomInvitePanel` on the room screen, and the tests that asserted a link on `/create` move with it
- One implementation of the lobby, for owner and guest alike, differing only in who is offered the start control — which the security rules already restrict to the owner
- The owner reaches the room by the same address as everyone else, so nothing about a room is reachable only by the client that created it
- A player who reloads, closes the tab, or opens the link on a second device lands in whatever the room is doing now, at every phase, because no screen holds state the document does not
- `roomPath` already exists in `apps/web/src/rooms/room-link.ts` and is what the redirect uses, so the route and the shared URL still cannot drift apart
- The invite link stays visible for as long as the room is in `lobby`, which is exactly as long as somebody can still join it
- Nobody sees the crossword during the lobby, the owner included. They have seen it already, on `/create`, and accepted that one — which is the only moment a grid can still be changed
- `UnplacedWordsNotice` stops being a screen of its own and becomes part of the preview, so the creation page has one shape instead of two
- The room is written to Firestore only once the owner has accepted a layout, so a rejected crossword costs nothing and leaves nothing behind
- [#29](https://github.com/vik8174/word-crossword-game/issues/29) is not superseded by any of this. With no readiness to make the count honest, a lobby that says `Players (2 of 4)` over a startable game still tells players to wait for two more, and the guest is still not told who starts
