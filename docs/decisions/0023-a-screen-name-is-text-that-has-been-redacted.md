# 0023. A screen name is text that has been redacted

Status: Accepted

## Context

[Issue #51](https://github.com/vik8174/word-crossword-game/issues/51) asks where people stop. Four screens stand between opening the app and the first word being explained — the home page, `/create`, the nickname form, and the lobby — and none of the three events this app sends says which one somebody got to: `room_created`, `player_joined` and `game_completed` all fire after a player is already in.

Two of the four are told apart by their address and are therefore already visible as page views. The other two are not, and they are the pair most worth telling apart: the nickname form and the lobby are two screens at one address, `/room/<id>`, chosen by `roomScreenFor` from the room document. A path cannot separate the visitor who never typed a nickname from the one who is sitting in a room waiting for the game to start.

Reporting a screen means sending its name, and a name is text. [ADR 0014](0014-telemetry-without-room-ids.md) had made that impossible on purpose: `GameEventParams` was `Readonly<Record<string, number>>`, and the comment above it called that "the whole guarantee that a room id, a word or a nickname never reaches Analytics — they are all strings, so an event carrying one does not compile."

Three ways out were on the table.

**Four event names**, one per screen. No type change, but `GameEvent` then grows by a line for every screen this game ever has, and a funnel assembled out of four unrelated event names is four queries rather than one dimension.

**A numeric enum** for the screen — `1` for home, `2` for create, and so on. Cheapest in types and the worst to read: it binds a meaning to a position implicitly, which is the failure [ADR 0009](0009-room-document-schema.md) refuses for the room document itself.

**Widening the parameter type** to accept text that has been through the redaction. The door already exists and is already used: `logPageView` sends three strings, all of type `Redacted`, and ADR 0014 blessed that as "the one thing that may carry text".

## Decision

**`GameEventParams` becomes `Readonly<Record<string, number | Redacted>>`, and the guarantee it states becomes: what has not been redacted does not compile.**

`Redacted` is produced by `redactRoomId` and by nothing else — the brand is unforgeable outside `redaction.ts` — so a `string` cannot be handed to an event as it stands. A room id, a nickname, a word and `window.location.href` are all `string`, and all of them are still refused at the call site, for every event written today and every event written after. That is the same kind of guarantee as the one it replaces, and it is checked in the same place: by the compiler, not by review. `analytics.test.ts` asserts it with a `@ts-expect-error` that fails the build if the line ever stops being an error.

**It is not the same guarantee, and the difference is stated here rather than discovered later.** The redaction removes room ids and nothing else, so a caller who reached for `redactRoomId(nickname)` on purpose would get a value this type accepts. Under "numbers, and nothing else" there was no such move. What closes it is that an event carrying text does not take text: `logScreenReached` asks for a `FunnelScreen` — `'home' | 'create' | 'join' | 'lobby'`, four literals fixed at compile time — so there is no value of its parameter that a player could have typed. The widened type is the floor under every event; each event that carries text names its own closed type as its door.

**One event, `screen_reached`, with the screen as a parameter.** A funnel is then one dimension of one event rather than four event names, and adding a screen later is a member of a union rather than a line in `GameEvent`.

### Deduplication is on the screen's kind, and never on the screen

`useScreenReached` watches a string out of four. It does not watch the `RoomScreen` object, and it does not watch the room.

This is the measurement rather than a detail of it. Since [#47](https://github.com/vik8174/word-crossword-game/issues/47), every client in a live room rewrites `players.<uid>.lastSeenAt` every fifteen seconds ([ADR 0022](0022-a-mark-a-player-writes-for-themselves.md)). Every one of those writes comes back to both players as a snapshot, every snapshot rebuilds `RoomConnection`, and `roomScreenFor(connection, new Date())` returns a **new object** each time it is called. An effect keyed on the screen object would therefore fire roughly four times a minute per player, at a screen nobody arrived at — and the funnel would be made of events that never happened. A reader would take it for the drop-off it is named after and it would be a measure of how long people sat still.

So `funnelScreenFor` takes `RoomScreen['kind']` rather than a `RoomScreen`: the signature says that only the kind may matter, and its return value is a string that changes when the player moves and at no other time. It is the dependency `usePageView` already keeps for the same reason — the path, not the location object — and the mirror image of the reasoning in `use-presence-heartbeat.ts`, where the effect watches a boolean and two strings so that its own writes cannot tear its own timer down.

Two tests hold it: the hook under repeated re-renders of one screen, and the room screen under sixteen consecutive snapshots carrying a fresh room document — two minutes of a real lobby — each asserting one event.

### The four screens report from two different places

The home page and `/create` are routes, so each reports from its own component. The nickname form and the lobby are two states of one route, so they report from `RoomPage`, which is where the switch between them lives — the screens themselves never learn they are being counted. Both sides call the same hook, so there is one definition of what an arrival is and one place it is deduplicated.

`funnelScreenFor` is a switch over every `RoomScreen` kind rather than a list of the two that count, so a screen added to the room has to say where in the funnel it sits instead of silently falling outside it. Five of the seven answer `null`, including `connecting`: nobody arrives at a spinner.

### Not decided here

What the game, the finish and a closed room report. The funnel this ticket measures ends at the first word being explained, and events past it are their own question.

## Consequences

- Analytics can answer where in the first four screens people stop, as one funnel over one event. It still cannot answer which room, which player or which words, and that remains the ceiling rather than a gap to close later
- The part of [ADR 0014](0014-telemetry-without-room-ids.md) reading "Analytics events carry numbers and nothing else" is superseded by this record. The rest of 0014 stands unchanged — the redaction, the two doors, the switched-off automatic page view, Sentry's `beforeSend`, and no tracing or replay
- Two of the four events partly duplicate what page views already say: the home page and `/create` are distinct paths and were already distinguishable. The new knowledge is the other two, which no page view could ever have separated. All four are sent anyway, because a funnel with two of its steps read from a different event is a funnel nobody will assemble correctly
- `screen_reached` fires again when a player comes back to a screen, because arriving twice is two arrivals. A visitor who returns to a room they left is a returning visitor, not a duplicate
- Anything else that ever carries text to Analytics has to bring a closed type of its own. The parameter type will accept any `Redacted`, so an event taking free text would pass it — the review that catches that is a review of the event's own signature, which is a much smaller thing to watch than every call site. `redactRoomId` is imported by `page-view.ts` and `funnel.ts` and nowhere else, so if that ever stops being a small thing to watch, the boundary is enforceable as a lint rule restricting who may import it — not decided here, because there is nothing outside `telemetry/` reaching for it to restrict
- Analytics still fails quietly. `logScreenReached` goes through `logGameEvent`, so a missing measurement id, cookies switched off or an unsupported browser leaves the game playable and sends nothing
