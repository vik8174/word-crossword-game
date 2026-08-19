# 0009. The room document schema and the room identifier

Status: Accepted

## Context

Creating a room ([issue #4](https://github.com/vik8174/word-crossword-game/issues/4)) is the first ticket that writes to Firestore, so it has to settle what a room actually looks like on disk. Everything that comes after reads and writes that document: joining a player (#5), assigning words (#6), entering guesses in real time (#7), the win condition (#8), reconnecting and TTL cleanup (#9). Changing the shape later means touching all of them at once.

Four constraints shaped it:

- **Clients write directly, with no backend of ours** ([0002](0002-no-dedicated-backend.md)). Whatever a browser can be tricked into sending, the security rules are the only thing that stops.
- **Firestore cannot nest an array directly inside another array.** `CrosswordLayout` is already designed around this ([0008](0008-crossword-layout-library-and-contract.md)) and is written into the document unchanged.
- **Several players write to the same document at the same time.** The game is cooperative and simultaneous, not turn-based: two players can solve two different words within the same second.
- **Words are hidden in the UI only** ([0004](0004-ui-only-word-visibility.md)). The document holds every word in plain text and every player fetches all of it, so splitting data by who may see it would buy nothing.

## Decision

### The document

One document per room in the `rooms` collection:

```ts
interface RoomDocumentShape<TTimestamp> {
  status: 'lobby' | 'playing' | 'completed';
  ownerId: string; // Firebase Auth UID of the creator, who also plays
  layout: CrosswordLayout; // written once at creation, never modified
  words: Record<string, RoomWordState>; // 'w0', 'w1', ... — mutable per-word state
  players: Record<string, RoomPlayer>; // keyed by Firebase Auth UID
  createdAt: TTimestamp;
  expiresAt: TTimestamp; // 24 hours out; what the Firestore TTL policy collects
}

interface RoomWordState {
  hiddenFromPlayerId: string | null; // set by word assignment (#6)
  guessedByPlayerId: string | null; // set when the word is solved (#7)
}

interface RoomPlayer {
  nickname: string;
  joinedAt: TTimestamp;
}
```

**Immutable core, mutable state.** `layout`, `ownerId` and `createdAt` are settled at creation; the game only ever writes to `status`, `words`, `players` and `expiresAt`. This split is what the security rules enforce, and it is why a word's spelling and cells are _not_ repeated in `words`: they live in `layout.placedWords`, which cannot change.

**`words` and `players` are maps, not arrays.** Firestore can update a single nested field (`words.w3.guessedByPlayerId`, `players.<uid>`) without rewriting its siblings; updating one element of an array means rewriting the whole array and losing whatever another player wrote meanwhile. The map also makes joining idempotent — the same UID rejoining overwrites its own entry, which is exactly what reconnect (#9) needs.

**Word ids bind to the layout by position:** `words['w' + i]` is the state of `layout.placedWords[i]`. `wordIdAt(index)` in `apps/web/src/rooms/room-document.ts` is the only place that spells this out; both sides go through it.

**Only placed words become part of the room.** Words the generator could not fit are shown to the owner as a warning and then dropped (user story 17); they are not stored.

**The schema lives in `apps/web/src/rooms/room-document.ts`, not in `packages/shared`.** The PRD listed room types among the shared modules, but timestamps make that impossible to do honestly: `packages/shared` is free of any Firebase dependency by design, while the TTL policy requires a real Firestore `Timestamp` field. The document is the persistence format, so it stays next to the code that persists it. `RoomDocumentShape` is parameterised by the timestamp type: the client writes `Date` (the SDK converts it) and reads back `Timestamp`.

**Room status is one field with three values,** not a set of booleans, so illegal combinations cannot be expressed. A future turn-based mode (a PRD note, not MVP) adds its own field rather than more statuses.

### The room identifier

The link points at a **Firestore auto-generated id** (`/room/<autoId>`), not a short human-readable code.

The PRD makes the copied link the only way to invite anyone — nothing is dictated aloud or typed by hand — so a code short enough to read out loud buys nothing, while costing collision handling on a client that has no backend to arbitrate. An auto-id is also unguessable, which matters more than usual here: with words hidden in the UI only, anyone who reaches a room sees every word in it. A four- or six-character code could be walked by a stranger; a 20-character auto-id cannot.

### The security rules

`firestore.rules` (verified against the Firestore emulator — `pnpm test:rules`):

- **create** — only a signed-in user, only a room they own, holding exactly the fields above, starting in `lobby`, with themselves as the only player, with a non-empty grid, with one word state per placed word, and with an `expiresAt` that is in the future but within 25 hours
- **get** — any signed-in user, so a player must sign in anonymously _before_ the room screen reads the document
- **list** — never; rooms are reachable only by their link, not by walking the collection
- **update** — any signed-in user, as long as `layout`, `ownerId` and `createdAt` are untouched, the set of words does not change, the room keeps at most 4 players, and `status` stays one of the three the game knows (a finished game cannot be reopened, so a player arriving late sees the result)
- **delete** — never; a room disappears only when the TTL policy collects it

The rules deliberately do not try to keep a player from reading a word hidden from them ([0004](0004-ui-only-word-visibility.md)).

> The "at most 4 players" above is **at most 2** since [#49](https://github.com/vik8174/word-crossword-game/issues/49): a game is played by exactly two. The rule kept its shape — only the number moved, together with `MAX_PLAYERS` on the client. Recorded here rather than edited into the text above, which says what was decided at the time.

## Consequences

- Issues #5-#9 have a shape to write against, and the immutable core means a bug in a later ticket cannot corrupt the crossword itself
- Two players solving different words at the same time do not overwrite each other, because each writes its own nested field
- Word state is bound to the layout by position, which is compact but implicit — anything reading a word must go through `wordIdAt`, and the invariant "one entry per placed word" is enforced by the security rules as well as by the builder
- Room types live outside `packages/shared`, so a future second client would import them from the web app or force the shape to be lifted out — accepted, since the MVP has exactly one client
- The rules check the shape of a room, not the values inside `players` and `words` (that a nickname is a string, that `guessedByPlayerId` is a UID or `null`). A buggy or hostile client that already holds the link can therefore write nonsense into the room it is in — the same trust boundary [0004](0004-ui-only-word-visibility.md) already accepts. Issues #6 and #7 are the ones writing into these maps and are the natural place to tighten this
- `expiresAt` is set by the client's clock. A skewed clock cannot shorten a room's life below the current moment or stretch it past 25 hours, because the rules reject both, but within that window the value is trusted
- The TTL policy that acts on `expiresAt` is **not** part of this repository: it has to be enabled once in the Firebase console (issue #9 covers the cleanup behaviour end to end)
- Anonymous sign-in must happen before the first read of a room, not after the nickname form — a constraint issue #5 has to honour
