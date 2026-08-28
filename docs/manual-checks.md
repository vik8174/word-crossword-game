# Manual checks

What a person has to see with their own eyes. Everything here is something the automated tests cannot reach in principle: how the board looks, two real browsers against a real database, the clipboard, a deploy that arrived, and what actually leaves the browser over the network. Manual checking has found what the tests did not five times in this project, most recently in [#69](https://github.com/vik8174/word-crossword-game/issues/69), where the narrow board turned out to be a `Container maxWidth="sm"` rather than the size of the window.

Nothing below repeats a test. If a step can be written as an assertion, it belongs in `*.test.ts` instead.

The checks are grouped twice over. First by moment, because it cannot all happen at once: one part is walked on stage **before** the tag and is self-contained, the other needs a production deploy, which only the tag creates. Then, inside each of those, by what a step is about — **Always**, and three subsystems, **the board**, **movement** and **telemetry**.

**A release tag walks every section.** The subsystem grouping exists so that a ticket touching the board can be checked against the board's steps while it is still open, without walking the whole list for a change that could not have affected the rest. It is not a way of shortening the pre-tag pass, and a section skipped before a tag is a section nobody checked.

## Before the tag, on stage

<https://word-crossword-game-stage.web.app>, on the release commit, once its deploy is green.

Two isolated browser profiles, the host and the guest; a private window is a second profile. Mark both before opening anything else: `https://word-crossword-game-stage.web.app/?internal=1`. Stage is a Firebase project of its own and has an analytics property of its own. Marking is right either way, but on stage it is only known to set the label: whether that property carries production's Internal Traffic filter has never been looked at. Leave DevTools > Network open on the host, filtered to `collect`.

The sections below are groups within one session rather than separate runs of the game. The order is fixed by the game itself — the board does not exist until the words are dealt, and a seat stops being given up the moment they are — so walk **Always** in order and take each subsystem step at the moment it names. Two of them need a room of their own and say so.

### Always

1. **Create a room**, from the medium [reference list](#reference-word-lists) below.
2. **The clipboard, against a real one.** The tests press **Copy link** against a stubbed `navigator.clipboard` and never touch the system clipboard. Press it here, then paste outside the app: what lands is the room's address. Should the browser refuse instead, the panel says so and the link is still on screen to be selected by hand.
3. **A guest arrives.** Open the link in the second profile and join. The host's invite panel goes when the guest is in.
4. **A guest leaves, while it is still a lobby.** Close the guest's tab. Within about a minute the invite panel is back on the host's screen; reopen the link in that same profile and the guest walks back in. After the deal no seat is ever given up again, so this is the only point in the session where it can be looked at.
5. **The host starts the game.** Both screens become the game on their own, with nothing reloaded, and the board is drawn.
6. **The words you explain stand apart at a glance.** That the squares are dashed and the letters italic is asserted in the tests; whether the difference is visible without looking for it, on a real screen, is not.
7. **Away, and being away.** Put one profile offline. Within a minute the other names them as away beside their name, and the offline one is told on its own screen that the room has stopped hearing from it. Bring it back before the next step.
8. **Play the game to the end**, out loud, both profiles. The finished room says so to both.
9. **A name the browser remembers.** The nickname field was empty on each profile's first visit. Open `/create` in the host's profile now that a game has been played: the field comes back filled with the name it was played under, offered rather than imposed, and it is the player's to rewrite.
10. **A game ended before it was over — in a room of its own.** Not in the room from step 8, and not in any room these steps have already been through: ending early is as terminal as playing to the end, so whichever way a room ended, it is over and the control is no longer in it. Make a second room for this one and keep it short — create it, let the guest in, start the game, answer a single word. Both profiles carry an **End the game** button by now; press the host's — that is the profile whose Network tab has been open all session — and confirm. Watch the _other_ profile as you do: its screen changes on its own, within about a second, with nothing reloaded. Then read the two screens against each other rather than each on its own, which is the whole of this step and the easiest part of it to skip. The word that was answered stands in the grid on both. The words nobody answered are spelled out on neither — except that each player still sees the ones they were explaining themselves, as they have all game, and those same words are empty squares on the other screen. That crossing is a fact about a pair of screens and cannot be read off one of them: each looks right on its own whichever way the app behaves, and only the two together show that a word kept from the player who was meant to guess it is still kept from them once the room is closed. Neither profile is left holding the button. The host's `collect` also carries `en=game_closed` once.

### When the board was touched

Steps 2 to 6 are taken inside the session above, from the deal onwards — there is no board before it, and step 6 waits further still, until all four states of a square are on screen at once. Step 1 is three rooms of its own and needs nobody to join them.

1. **Three lists, and the one that scrolls.** Create a room from each of the three [reference lists](#reference-word-lists), in the same window, and look at the board each one draws. The squares get smaller from list to list, and only the heaviest of the three reaches the floor: the short list is drawn at the 44-pixel ceiling, the medium one somewhere in between, the heavy one at or near the 20-pixel minimum. Then narrow the window steadily, watching all three in turn. The heavy board is the first — and on a desktop window the only one — to stop shrinking and start scrolling instead, in both directions; the other two still have room to shrink into. **That the heavy board scrolls is the expected result and not a defect:** below the floor a letter stops being comfortably readable, so the board stops shrinking on purpose ([ADR 0029](decisions/0029-a-board-that-fits-the-screen-it-is-played-on.md)). What is being confirmed is that the floor is where scrolling begins, and that a list a game is actually played with never gets there.
2. **The widest board, drawn.** On a desktop window it fits whole rather than scrolling sideways, which is what [issue #101](https://github.com/vik8174/word-crossword-game/issues/101) changed, so what is being looked at is the size the squares came out at: every square legible, and a number in the corner of one without clipping or covering the letter typed into it. Narrow the window until the board does not fit and it scrolls in both directions — sideways only would cut the bottom off, and a board cut off at the bottom is a board with words nobody can reach.
3. **A word off the right-hand edge can be reached.** Tap it in the panel beside the grid. The grid scrolls far enough that the whole word is actually on screen, which is a layout jsdom has no width to have.
4. **A letter being typed survives the change of layout.** The room is laid out three ways and the window decides which: a document below 768 by 600 pixels, an application above it, and the board with an index either side of it from 1200. Start typing a word, and with the cursor still in the middle of it drag the window slowly across both of those widths and back. The letters keep landing in the square they were landing in; the cursor does not jump to the start of the word, and it does not leave the grid for the page. Nothing in jsdom has a width, so no test can see this.
5. **The board's sideways scroll survives the change of layout.** On a board wider than the space it is drawn in, scroll it to the right — or reach a word off the edge as in step 3 — and then cross the same two widths. The board comes back at the same place rather than snapped to its left edge, with the word still on screen.
6. **Four states of a square, in greyscale.** Screenshot the board mid-game, with all four on it: a square nothing has reached, a square of a word this player is filling in, a square of a word they are explaining, and a square of a word already answered. Convert the screenshot to greyscale and look at it again. All four are still told apart. Colour is not allowed to be the only difference: a player who reads a word they are explaining as one the pair has answered stops explaining it, and the game stalls with both people waiting ([ADR 0015](decisions/0015-explained-words-in-the-grid.md)).

### When movement was touched

Nothing in the app moves yet, so this section is empty on purpose rather than by omission. The tickets that put something in motion each bring their own steps here, together with the feature: what may move and what may not is decided in [ADR 0030](decisions/0030-where-movement-is-allowed.md), and every rule in it costs a step a person has to walk.

### When telemetry was touched

Both are taken in the host's profile, whose Network tab has been open since the beginning.

1. **What the telemetry just sent.** Straight after creating the room. Creating one sends two `collect` requests at once and both are page views; the one to read is the later request carrying `en=room_created`, which is batched rather than sent on its own. It has the word count in `ep.word_count`, and nowhere in any of the three is the room id out of your own address bar — the page views name the route, `dp=/room/:roomId`. At the end of the session, the room ended early also sends `en=game_closed` exactly once.
2. **A console that is not red, and one cookie of each name.** The console half is Firefox's, and only Firefox's: it writes a line for every cookie it refuses, while Chromium refuses the same one in silence and files it under Issues, so a clean console in Chrome would be a tick proving nothing. In Firefox, then: DevTools > Console holds not a word about a cookie rejected for an invalid domain. Two other things are expected to be in there and are not what this step is reading. A pair of yellow warnings that `The value of the attribute "expires" for the cookie "_ga_<measurement id>" has been overwritten.` is gtag rewriting the lifetime of its own session cookie on every load: GA4 behaviour, the same on any site with analytics, and nothing to do with which domain a cookie is written on. A red `TypeError` from `h1-check.js` belongs to a browser extension rather than to this app. Neither is a remnant of the rejected-domain lines, though both were read as one the first time this step was walked. The rest of the step holds in any browser. Then Storage > Cookies: exactly one `_ga` and exactly one `_ga_<measurement id>`, both on the stage host — two of a name would be a second, host-only cookie written beside the old one. Reload the page: `cid` in the next `collect` is the one it was, so the client id survived.

## After the tag, on production

<https://word-crossword-game-prod.web.app>.

### Always

1. **Mark the profile first, before anything else.** Open `https://word-crossword-game-prod.web.app/?internal=1` in the fresh profile as its very first visit. Every event before the mark is counted as a player forever, and nothing later takes it back. The mark belongs to that one profile and no other.
2. **The build that arrived is the one that was tagged.** Sentry > Releases holds a release named `X.Y.Z+<twelve characters of the commit>` for the commit the tag is on, with the source maps of this build under it.
3. **An invite link opened cold is a room.** Paste `/room/<id>` into a fresh tab rather than following it from inside the app. A room, not a 404.
4. **Play one game to the end on production**, two profiles, both marked.

### When telemetry was touched

1. **The events are leaving the browser at all.** DevTools > Network, filter `collect`, and play far enough to send something. The request goes out and is answered. An empty Realtime report in GA4 means one of two different things — the internal mark working, or the browser's tracking protection blocking the request — and this is the step that tells them apart ([known limits](known-limits.md)).

## Reference word lists

Three lists, fixed here rather than invented at each release, so that a board is looked at with the same words every time and "it scrolled" means the same thing in two different months. Each one is valid on its own: ten to twenty words, three to sixteen letters, Latin, no duplicates.

**Short — ten ordinary words.** The list a game is most likely to be played with. The generator lays it out at roughly 14 squares by 11.

```
rain garden window bridge candle teapot silver forest pocket lantern
```

**Medium — fifteen, mixed lengths.** Four of them are thirteen letters or more, so the board is a realistic one rather than a small one — roughly 24 squares by 31. This is the list the stage session is walked with.

```
river lantern harbour mountain umbrella celebration wilderness photographer
understanding neighbourhood conversation thunderstorm imagination
responsibility transformation
```

**Heavy — twenty words of twelve to sixteen letters.** Roughly 30 squares by 28, and the only one of the three expected to reach the floor and scroll.

```
accommodation administration championship characteristic congratulation
consciousness determination disappointment encyclopaedia entertainment
environmental extraordinary international investigation manufacturing
neighbourhood photographer professional qualification representative
```
