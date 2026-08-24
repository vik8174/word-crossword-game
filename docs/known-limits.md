# Known limits

Things the game does that look like defects and are not. Each was decided or discovered somewhere, and that record is the source of truth; this page only gathers them so that the answer is in one place instead of six. Nothing here should be filed again.

Not every limit has something that will lift it, and they do not all fail to in the same way. Two wait on work this project has decided not to do, real sign-in and a backend of its own; one is an open question with a stated trigger rather than a plan; one is a setting in somebody else's browser and was never ours to lift. Saying which is which is more honest than naming a ticket that does not exist.

**The crossword is wider than the box it is drawn in, and scrolls sideways.**
The board is generated from the word list before anyone joins, so its width follows the list rather than the screen: twenty ordinary words are 25 columns and 850 pixels against a container of about 552, and twenty long ones are 1462 pixels, which outgrows a 1280-pixel window as well. It is navigable either way, since tapping a word in the panel takes the player to it.
Recorded in [ADR 0017](decisions/0017-desktop-first-while-the-grid-outgrows-a-phone.md). Lifted by: nothing yet. How the board should be drawn instead is 0017's open question, and what reopens it is its second review condition, the game being played by people who did not build it on the devices they own.

**A host who lost their browser identity cannot be recognised as the host.**
A player is a UID issued per browser profile, so clearing site data, switching profile or reopening the link in a private window comes back as somebody else. Clearing site data takes the remembered nickname with it, `word-crossword-game:nickname` sitting beside `word-crossword-game:traffic-type` in the same storage, so a browser that stops being the host stops being marked and stops knowing its own name in one move. The host's seat is the one seat nothing ever frees, so it is held for a UID no browser can produce any more, and the room lives out its 24 hours unable to start.
Recorded in [ADR 0025](decisions/0025-what-happens-to-the-seat-of-a-player-who-left.md). Lifted by: real sign-in, which [the PRD](https://github.com/vik8174/word-crossword-game/issues/1) rules out for the MVP. Nothing is planned, and the browser that made a room is the browser that plays in it.

**Leaving is silence, not an action.** There is no way to say "I have gone", only to stop writing: a player is away once their own mark is 45 seconds old, and a lobby seat is free once it is 60. So a player who steps out looks exactly like one whose connection dropped, and for the first minute like one who is simply thinking. Ending the game is not the missing announcement: it closes the room for both players rather than taking one of them out of it.
Recorded in [ADR 0022](decisions/0022-a-mark-a-player-writes-for-themselves.md) and [ADR 0025](decisions/0025-what-happens-to-the-seat-of-a-player-who-left.md). Lifted by: nothing, and here "nothing" is a decision rather than an absence. Once the words are dealt a seat cannot be emptied at all — a word is dealt to a UID and the win is read from those same fields, so a player taken out of a game leaves a crossword nobody could ever finish, which is why [ADR 0027](decisions/0027-a-game-a-player-can-end.md) gave the game an ending instead of giving one player a door.

**The words are physically in the room document, hidden only by the screen.**
A player determined to cheat can read the words hidden from them in DevTools or the network tab. This is a game played between people who know each other, not a competition with stakes, and the whole room being one document is what keeps the data simple.
Recorded in [ADR 0004](decisions/0004-ui-only-word-visibility.md). Lifted by: splitting the room into documents guarded by security rules, which 0004 reserves for public matchmaking or a competitive mode. Neither exists, and with no backend of ours ([ADR 0002](decisions/0002-no-dedicated-backend.md)) the browser is always holding what it is shown.

**The internal-traffic mark is forgotten by every fresh browser profile.**
`?internal=1` is remembered in one profile's own storage, so a new isolated profile, a private window or a browser with storage switched off knows nothing of it and is counted as another player. Nothing about it works backwards in either direction.
Recorded in [issue #68](https://github.com/vik8174/word-crossword-game/issues/68) and in [Not counting my own visits](../README.md#not-counting-my-own-visits). Lifted by: nothing. Remembering to mark the profile is the price of a mark the browser carries instead of a rule built on an IP address, and it is why marking is the first step of the production checks in [`manual-checks.md`](manual-checks.md).

**Strict tracking protection in the player's browser blocks GA4 outright.**
Firefox classes requests to `google-analytics.com/g/collect` as a tracker; at its current level it lets them through, and a stricter one would not. The trap is that blocked events look exactly like a working internal-traffic mark: empty in both cases, with nothing to say which. The network tab tells them apart, and no analytics report can.
Found on production on 2026-08-21, during the 1.1.0 release, and written down for the first time in [issue #81](https://github.com/vik8174/word-crossword-game/issues/81) — it is not our decision and has no ADR. Lifted by: nothing we own. It is a setting in somebody else's browser.
