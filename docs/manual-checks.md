# Manual checks

What a person has to see with their own eyes. Everything here is something the automated tests cannot reach in principle: how the board looks, two real browsers against a real database, the clipboard, a deploy that arrived, and what actually leaves the browser over the network. Manual checking has found what the tests did not five times in this project, most recently in [#69](https://github.com/vik8174/word-crossword-game/issues/69), where the narrow board turned out to be a `Container maxWidth="sm"` rather than the size of the window.

Nothing below repeats a test. If a step can be written as an assertion, it belongs in `*.test.ts` instead.

The list has two parts, because it cannot all happen at one moment: the first part is walked on stage **before** the tag, and it is self-contained. The second needs a production deploy, which only the tag creates.

## Before the tag, on stage

<https://word-crossword-game-stage.web.app>, on the release commit, once its deploy is green. Two isolated browser profiles: the host and the guest. A private window is a second profile.

Mark both profiles before opening anything else: `https://word-crossword-game-stage.web.app/?internal=1`. Stage is a Firebase project of its own and has its own analytics property, counted the same way production's is.

1. **The widest board.** Create a room with a list including several 13-to-16-letter words. The grid scrolls sideways inside its container and every square is legible; a number sits in the corner of a square without clipping or covering the letter typed into it.
2. **The words you explain stand apart at a glance.** That the squares are dashed and the letters italic is asserted in the tests; whether the difference is visible without looking for it, on a real screen, is not.
3. **A word off the right-hand edge can be reached.** Tap it in the panel beside the grid. The grid scrolls far enough that the whole word is actually on screen, which is a layout jsdom has no width to have.
4. **The clipboard, against a real one.** The tests press **Copy link** against a stubbed `navigator.clipboard` and never touch the system clipboard. Press it here, then paste outside the app: what lands is the room's address. Should the browser refuse instead, the panel says so and the link is still on screen to be selected by hand.
5. **A guest arrives.** Open the link in the second profile and join. The host's invite panel goes when the guest is in.
6. **A guest leaves.** Close the guest's tab. Within about a minute the invite panel is back on the host's screen, and the link works again from a third profile.
7. **Away, and being away.** With both in the room, put one profile offline. Within a minute the other names them as away beside their name, and the offline one is told on its own screen that the room has stopped hearing from it.
8. **What the telemetry actually sends.** DevTools > Network, filter `collect`, then create a room. The request that leaves carries `room_created` and a word count, and nowhere in its address or its payload is the room id out of your own address bar.
9. **Play one game to the end**, two profiles, out loud. The finished room says so to both.

## After the tag, on production

<https://word-crossword-game-prod.web.app>.

1. **Mark the profile first, before anything else.** Open `https://word-crossword-game-prod.web.app/?internal=1` in the fresh profile as its very first visit. Every event before the mark is counted as a player forever, and nothing later takes it back. The mark belongs to that one profile and no other.
2. **The build that arrived is the one that was tagged.** Sentry > Releases holds a release named `X.Y.Z+<twelve characters of the commit>` for the commit the tag is on, with the source maps of this build under it.
3. **An invite link opened cold is a room.** Paste `/room/<id>` into a fresh tab rather than following it from inside the app. A room, not a 404.
4. **The events are leaving the browser at all.** DevTools > Network, filter `collect`, and play far enough to send something. The request goes out and is answered. An empty Realtime report in GA4 means one of two different things — the internal mark working, or the browser's tracking protection blocking the request — and this is the step that tells them apart ([known limits](known-limits.md)).
5. **Play one game to the end on production**, two profiles, both marked.
