# Ubiquitous language

The words this project uses for its own parts, with one definition each. It exists because the language was real but scattered: it lived across thirty ADRs and in the names of types, so every new session reconstructed it, and two sessions reconstructed it differently.

A term is here when it names something the game has — a room, a seat, a deal — or when it is a word ordinary English would use for two different things. Where a definition points at code, the code is what it describes rather than an example of it.

**Keeping this file current is nobody's per-ticket duty.** An obligation checked at review rots within two releases, and this project has watched one do it. Add a term when a ticket invents one; correct a definition when you find it lying.

## Two words that are not each other

- **Home** — the page at `/`, where a new game is started (`HomePage`, `home` in the telemetry funnel). Nothing else is Home.
- **Lobby** — the screen of a room between joining it and the words being dealt out (`RoomScreen.kind === 'lobby'`). It is inside a room, it has an owner and a guest in it, and it is reached by an invite link. **It never means the landing page**, and "back to the lobby" is not a sentence this project can say.

## A room and the people in it

- **Room** — one game, and one Firestore document under `rooms/<id>` holding all of it: the crossword, the players, the per-word state. There is no other place a game is kept ([0009](docs/decisions/0009-room-document-schema.md)).
- **Room document** — that document as a shape: `RoomDocument` when read back from Firestore, `NewRoomDocument` on the way in, the two differing only in how a timestamp is spelled.
- **Room id** — the id Firestore gave the document. Not a name for a room but the whole of the access control around it, which is why it is taken out of everything the browser reports ([0014](docs/decisions/0014-telemetry-without-room-ids.md), [0023](docs/decisions/0023-a-screen-name-is-text-that-has-been-redacted.md)).
- **Invite link** — the full URL of a room, `…/room/<id>`. The only way into a game; there are no in-app invitations, and the host is the one who has it ([0026](docs/decisions/0026-the-invite-link-belongs-to-the-host.md)).
- **Owner**, also **host** — the player who created the room. `ownerId` in the document. They play like anybody else, and they are the only one who can deal the words out.
- **Guest** — the other player, the one who arrived through the invite link.
- **Player** — a participant, keyed in `players` by their Firebase Auth UID. A UID is issued per browser profile, so the same person in a second profile is a second player.
- **Nickname** — the name a player typed, and the only thing the other player sees them by. At most `MAX_NICKNAME_LENGTH` characters; the browser offers back the last one used, per profile.
- **Seat** — a place in a room. There are exactly two (`PLAYERS_PER_GAME`), and a seat is not a `players` entry: it is the right to become one. A seat may be given up in the lobby and never after the deal ([0025](docs/decisions/0025-what-happens-to-the-seat-of-a-player-who-left.md)).
- **Presence mark** — `players.<uid>.lastSeenAt`, rewritten by that player's own client every fifteen seconds while it is in a room. Nothing announces a departure; the age of this mark is the whole of what anybody knows ([0022](docs/decisions/0022-a-mark-a-player-writes-for-themselves.md)).
- **Away** — a mark older than `AWAY_AFTER_MS` (45 seconds). Shown beside a name, and taken back the moment the player writes again.
- **Abandoned seat** — a seat whose mark is older than `SEAT_FREE_AFTER_MS` (60 seconds) while the room is still a lobby. Somebody arriving may take it, and that cannot be taken back.
- **Room lifetime** — the 24 hours of `ROOM_LIFETIME_MS`, refreshed on activity and enforced by `expiresAt` and Firestore's TTL policy. There is no other way out of a room.

## The crossword

- **Word list** — the words the owner types on `/create`, between `MIN_WORDS` (10) and `MAX_WORDS` (20), each from `MIN_WORD_LENGTH` (3) to `MAX_WORD_LENGTH` (16) letters, Latin, no duplicates. It is validated before a room exists, never after.
- **Layout** — `CrosswordLayout`, the crossword as generated at creation time from the word list: rows, columns, cells, placed words, unplaced words. Written once and never modified.
- **Placed word** — a word that fit into the grid, with the squares that spell it in reading order. Two placed words intersect when they share a square.
- **Unplaced word** — a word from the list that did not fit. Placed plus unplaced always add up to the list, so no word is silently lost.
- **Square**, in code a **cell** — one position of the grid. A square with a letter is a `CrosswordCell`; positions with no word through them are simply absent from `cells`.
- **Number** — the crossword number printed in the corner of the square a word starts in, produced by `numberCrossword`. It says that a word begins there and nothing about how the word reads, so it is safe on any screen.
- **Board**, also **grid** — the crossword as it is drawn. A square is a `clamp()` between `MIN_CELL_SIZE` (20px) and `MAX_CELL_SIZE` (44px) worked out by the browser from the space the board has; at the floor the board scrolls instead of shrinking further ([0029](docs/decisions/0029-a-board-that-fits-the-screen-it-is-played-on.md)).
- **Word id** — `w0`, `w1`, …, the key of a word in the document's `words` map, where the number is its index in `layout.placedWords`. `wordIdAt` is the only binding between the immutable layout and the mutable state, and both sides go through it.
- **Word state** — `RoomWordState`: who the word is hidden from, and who guessed it. The spelling is not repeated here; it is in the layout.

## Playing

- **Deal** — the one moment the owner splits the words between the two players. It moves the room from `lobby` to `playing`, it cannot be taken back, and after it no seat is ever freed again. `assignWords` decides it; `WordAssignment` is the result, by word position.
- **Explained word** — a word hidden from the _other_ player, so this one can see it and talks it into existence out loud. Written into their own grid in italics on dashed squares, on their screen alone ([0015](docs/decisions/0015-explained-words-in-the-grid.md)).
- **Guessable word** — a word hidden from _this_ player: the one they type in. It reaches the screen as squares plus a function that answers whether some letters spell it, so the spelling never crosses the boundary ([0011](docs/decisions/0011-typing-guesses-into-the-grid.md)).
- **Guess** — the letters a player has typed into the squares of one word. It is checked by `checkGuess`, and a word is answered when its squares are full and spell it, however they were filled.
- **Answered**, in code **solved** — a word whose `guessedByPlayerId` is set. Its letters go plain and are the same on both screens. Not always the work of the player it is recorded against: a word completed entirely by its intersections is written to the player it was hidden from, which is one reason the finished screen carries no score.
- **Cursor** — the square the next letter will land in. State of the grid rather than the browser's focus: the squares of other people's words are boxes rather than inputs, and the arrows cross them like any other square ([0016](docs/decisions/0016-the-cursor-lives-in-the-grid.md)).
- **Grid view** — `GridView`, the board as one player's screen may draw it. Every square says what it holds and why: `empty`, `solved`, or `explained` — never a letter whose reason has been lost.
- **Left out** — the state of a player the deal did not cover. They have nothing to guess, so they are shown nothing rather than shown the crossword.

## What a room is showing

- **Status** — how far a room is: `lobby`, `playing`, `completed` (every word answered), `closed` (a player ended it with words unanswered). One field with four values, so illegal combinations cannot be written down.
- **Terminal** — `completed` or `closed`. A room in either stays in it, and the security rules hold that line rather than trusting the client ([0027](docs/decisions/0027-a-game-a-player-can-end.md)).
- **Screen** — which of the seven things the room address is showing, decided as one value and never as a set of flags: `connecting`, `unavailable`, `join`, `lobby`, `playing`, `finished`, `closed-early` (`RoomScreen`).
- **Finished** — the screen of a crossword that was filled in. It waits on the board being genuinely full and not on the status, which a client could write over a game nobody played ([0012](docs/decisions/0012-ending-a-game-from-the-received-state.md)).
- **Closed early** — the screen of a game a player ended. It is not a quieter `finished`: words are still unanswered, and it is never celebrated ([0030](docs/decisions/0030-where-movement-is-allowed.md)).
- **Unavailable reason** — why a room cannot be entered: `missing`, `expired`, `started`, `finished`, `full`, `refused`, `connection`.
- **Refusal** — the security rules turning a write down, which Firestore reports as `permission-denied` and nothing more. It is news about the room; every other failure is news about the wire, and the two are told apart in one place (`wasRefusedByRules`).
- **App shell** — the room as an application rather than a document: the height of the window, no page scroll, the board always on screen. From 768 by 600 pixels upwards; with an index either side of the board from 1200. A phone stays a document that scrolls ([0029](docs/decisions/0029-a-board-that-fits-the-screen-it-is-played-on.md)).
- **Zone** — one of the room's three areas: what this player explains, the board, what they are being explained.

## What leaves the browser

- **Funnel screen** — one of the four screens on the way to the first word: `home`, `create`, `join`, `lobby`. Four literals rather than free text, so nothing a player wrote can be reported as one.
- **Game event** — what the app reports to Analytics: `room_created`, `player_joined`, `game_completed`, `game_closed`, `screen_reached`. `game_completed` and `game_closed` are two events because they are two different endings.
- **Redacted** — text that has been through `redactRoomId`. A type nothing carries at runtime, so handing an unredacted address to a telemetry SDK is a compile error rather than a room id in somebody else's dashboard.
- **Internal traffic mark** — `?internal=1`, remembered in one browser profile's own storage, which keeps the people building the game out of its numbers. Forgotten by every fresh profile, and it does not work backwards.

## Look and feel

The four tokens are named in Japanese, and those names live in the code rather than in a comment beside it. They are declared inside the MUI theme, which is the only source of truth about colour ([0028](docs/decisions/0028-a-design-system-inside-the-mui-theme.md)).

- **`washi`** — the warm neutral ground. Paper.
- **`sumi`** — the dark ink: body text, the lines of the grid.
- **`sakura`** — the accent that carries the atmosphere. Atmosphere only: it is kept away from the board, where pink already means a refused answer.
- **`matcha`** — the second accent.
- **Shift** — the movement one screen of a room makes when it becomes the next one: the screen that was goes left, the one replacing it comes in from the right over it, and the frame around them does not move. Keyed on which `RoomScreen` is showing and never on a redraw, because a room redraws roughly every seven seconds all game ([0030](docs/decisions/0030-where-movement-is-allowed.md)).
- **Petals** — the falling background of every screen except the game. Their absence during a game is deliberate, and their return at the end is the greeting ([0030](docs/decisions/0030-where-movement-is-allowed.md)).
- **Garden** — the petals as one thing: a single canvas behind the whole app, outside the router and outside the shift, which every screen is drawn in front of (`garden/`). What it is doing at any moment is the **air**: `petals` or `still`.
- **Greeting** — the garden coming back when a game is played to the end: a sky that starts thick and thins out into the ordinary background. It fires on the change from `playing` to `finished` inside one session, never on the `finished` screen being shown, and never for `closed-early`.
- **Level** — one of the four sizes text is set in: 31, 23, 17 and 13, each a third larger than the one under it. **Title** names the game and names a room, **heading** names a panel and names the board, **body** is what is read, **aside** is a hint, a counter, anything the eye passes over. There is no fifth, and a place that seems to want one is one of these four in the wrong position (`scale.ts`).
- **Face** — a typeface in the role it plays, and there are three. The **display face** (Zen Old Mincho) is the letters of the crossword and the two large levels; the **sign face** (Zen Kaku Gothic New) is lettering rather than text, in capitals held apart, and it is what the garden paints its words in; the **text face** is whatever the reader's own system draws, and everything that is read is set in it.
- **Step** — one of the seven gaps every space in the interface is: 4, 8, 12, 16, 24, 32 and 48 pixels. Written as an index into that row rather than as a multiple of anything, so `mt: 5` is the fifth step and there is nothing between the fifth and the sixth.
