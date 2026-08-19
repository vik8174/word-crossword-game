# 0013. Keeping a room alive on every write

Status: Accepted

## Context

A room is created with `expiresAt` 24 hours out ([ADR 0009](0009-room-document-schema.md)), and until [issue #9](https://github.com/vik8174/word-crossword-game/issues/9) nothing ever moved that value again. The Firestore TTL policy that collects stale rooms reads it, so the field looked like housekeeping — something that mattered only to the database bill.

It is not. The security rules check `expiresWithinLifetime` on **every** update, so the field decides whether a room accepts writes at all. A room whose expiry stopped moving stops taking writes the moment it runs out: an answer typed into the grid is refused, the game cannot be closed, and nobody can join. A game played across more than a day would die in the middle of itself. Keeping the field fresh is not cleanup — it is what keeps a live game live.

That left two questions.

**Where does the refresh live?** A room takes four kinds of update — a player joining, the owner dealing the words out, a word being answered, the game being closed — and more will come. Adding `expiresAt` to each of them by hand works exactly until somebody adds a fifth and forgets, and the bug that follows is invisible for 24 hours and then kills a game.

**May an expired room be revived?** The rules only ever checked the value being written (`after`). Once every write carries a fresh expiry, that check passes by construction, so any client holding the link could write to a room long past its lifetime and bring it back.

## Decision

**Every update to a room is built by `room-document.ts` and carries a fresh `expiresAt`.** `buildRoomUpdate(fields, now)` is the only function that produces the `RoomUpdate` type, and `RoomUpdate` is the only thing `room-service.ts` will write:

```ts
declare const roomUpdateBrand: unique symbol;
export type RoomUpdate = Readonly<Record<string, unknown>> & { readonly [roomUpdateBrand]: true };

const writeToRoom = (roomId: string, update: RoomUpdate): Promise<void> =>
  updateDoc(doc(db, ROOMS_COLLECTION, roomId), update);
```

The brand exists only in the type system — nothing carries it at runtime, and no extra field reaches Firestore. What it buys is that an update assembled by hand cannot be passed to `writeToRoom`: forgetting to keep the room alive is a compile error rather than a room that dies mid-game. The expiry cannot be passed in either; it is written last, over whatever the caller supplied. What keeps a room alive is being played, never a value a caller chose.

**An expired room cannot be revived.** `firestore.rules` now checks expiry on both sides of an update: `isStillAlive(before)` alongside `expiresWithinLifetime(after)`.

The reason is Firestore's own timing. A TTL policy deletes _lazily_ — Google's guarantee is "usually within 24 hours of the expiry", not at the second it passes — so an expired room is still readable and, without this check, writable. It is also already condemned: it may be collected at any moment, so a game resumed inside one would vanish mid-word with no explanation anybody could give. Better to refuse the resumption than to allow a game that disappears.

No client tries: `roomAccessFor` returns `expired` for everyone, including players already in the room, and the screen writes nothing. This is the same belt-and-braces the rest of the rules apply — the screen explains, the rules enforce.

## Consequences

- A game that runs long stays playable: as long as somebody is doing anything in a room, its 24 hours keep restarting, and the room is collected only after a full day of nobody touching it. The 24 hours are now genuinely "of inactivity", which is what [issue #9](https://github.com/vik8174/word-crossword-game/issues/9) asked for and what the PRD described
- A new kind of write cannot silently skip the refresh; `RoomUpdate` has to be gone through, and going through it is what refreshes the room
- Two players writing in the same second both push the expiry, to values milliseconds apart. The last write wins and the difference is meaningless — unlike the `words` and `players` maps, which stay per-field writes for exactly the reason this field does not have to ([ADR 0009](0009-room-document-schema.md))
- `expiresAt` is still the client's arithmetic, so a badly skewed clock can still produce a value the server refuses (`request.time` is the server's). The rules guard the upper bound; the lower bound is guarded only by refusing the write outright, which surfaces as a failed action rather than a silent one. Accepted for the MVP, as in [ADR 0009](0009-room-document-schema.md)
- Once a room has expired it is over for good, even in the window before Firestore actually deletes it. There is no way back into it and nothing offers one
- Since [#47](https://github.com/vik8174/word-crossword-game/issues/47), a client in a live room writes to it every fifteen seconds to say it is there ([ADR 0022](0022-a-mark-a-player-writes-for-themselves.md)). The rule above is unchanged and so is its reasoning — a heartbeat is the most direct evidence a room is being used that this app has — but its reach is worth naming: **the TTL policy no longer collects a room while a tab is open on one.** "24 hours of inactivity" now means 24 hours with no tab on the room rather than 24 hours with nobody doing anything in it, so a browser left open on a lobby holds its room until it is closed. Accepted knowingly; the alternative is a client that stops saying it is there while it is there
- The TTL policy itself is still not part of this repository: it is enabled once by hand in the Google Cloud console, on the `expiresAt` field of the `rooms` collection. The app cannot create it and does not depend on its timing — the `expired` state exists precisely because the document outlives its expiry
