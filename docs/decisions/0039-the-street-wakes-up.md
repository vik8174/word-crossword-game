# 0039. The street wakes up

Status: Accepted. Supersedes [0030](0030-where-movement-is-allowed.md), the rules for movement. The ADR records the language of movement, its two curves, the events that start it, the rule for the fiesta, and the rule for reduced motion.

## Context

[0030](0030-where-movement-is-allowed.md) allowed one movement, the shift of a screen, and removed the rest on purpose: the petals, the cloth and the crossfade were the garden's. The garden is gone ([0038](0038-across-the-street-replaces-the-garden.md)). The street of design v2 is drawn to move, and Viktor asked for premium, thematic motion on 2026-10-14. The drawing (`design/templates/state-tree.html`, the motion block, lines 308-359) already holds every number, and the timings are the drawing's ([#219](https://github.com/vik8174/word-crossword-game/issues/219)).

## Decision

**One language, taken from the drawing and written once.** `apps/web/src/motion.ts` holds the two curves and every duration, delay and stagger of the table in [#230](https://github.com/vik8174/word-crossword-game/issues/230). `motion-styles.ts` writes the rules from those numbers, for the first visit, and `motion-play-styles.ts` writes the rules of the room and the form, which are fetched with those pages. The class names are those of the drawing (`shutter`, `who`, `line-draw`, `card`, `pegged`, `lantern`, `confetti`, `fiesta`, `flag`, `cell just`, `cell refused`, `msg`, `dialog`, `modal-veil`, `field-fault`). A change to a number is made in the drawing first.

**Two curves, and the CSS keywords the drawing uses.** `--out` is `cubic-bezier(.22, 1, .36, 1)`: things arrive with it. `--spring` is `cubic-bezier(.34, 1.56, .64, 1)`: things celebrate with it. The keywords `ease`, `ease-out` and `ease-in-out` are used where the drawing uses them and nowhere else. MUI's four easing slots point at `--out`, so no MUI component moves on a third curve.

**Four events start movement, and a redraw is never one of them.**

- A new screen. `ScreenEnter` marks the screen `enter` for 2 seconds after it mounts, and the caller keys it by which screen is showing. The page blocks rise 14 px one after another, the shutters swing, the neighbours lean in, the line is drawn and the cards fade in. `--i`, the place of a block, counts in reading order across the whole screen from 0. The drawing counts it again for each group of blocks, and that is the drawing's artefact, not built. The header is the frame of [#245](https://github.com/vik8174/word-crossword-game/issues/245): it is mounted once and never rises. A reload or a new tab opens a screen too, so it rises, as the drawing does on its first render. This reverses 0030, which let the first screen of all arrive still.
- A word is answered. The squares of the word turn over one after another and its card is pegged on the line, on every client, in the moment the word turns answered in that client's view. A room that is opened with the word already answered shows it answered, with no movement.
- A wrong answer. The squares shake once.
- A thing appears or opens: a message rises, the fault strip of a field unfolds, the dialog lifts off the page over a veil.

A snapshot of the room is none of these. A room redraws about every seven seconds all game, in every client, and nothing in it moves for that (the rule 0030 set, which stands).

**The fiesta plays on arrival only.** The card, the flags, the lanterns and the confetti arrive on the change from `playing` to `finished` seen within one session, as 0030 decided for the greeting it replaces. `RoomPage` knows which screen it replaced and gives `ScreenEnter` the flag that sets `data-fiesta="arrives"`. A reload, a new tab or a link on a finished room shows Finished in its final state, with only the two sways running. A game ended early has no fiesta. The lesson screens that reuse the card play by the same rule.

**Reduced motion is answered with nothing moving, not slower movement.** Every rule is inside `prefers-reduced-motion: no-preference`, so with reduced motion every element is in its final state at the first frame and nothing waits. The global rule in `theme.ts` for what MUI draws sets delays to zero as well as durations: a duration of 0.01 ms with the delay left alone would hold a delayed element invisible for the whole delay. It is the system's setting and not an option in the app.

**Only these properties animate:** `transform`, `opacity`, `clip-path`, `background-color`, `box-shadow`, and `stroke-dashoffset` on the line alone. `stroke-dashoffset` does not run on the compositor and is allowed for the one line. A test walks the keyframes and fails on any other property.

## Consequences

- `ScreenShift`, `screen-shift.ts` and the rule that two screens stand on the page at once for 180 ms are gone. A screen that is replaced is replaced at once and the new screen rises.
- No motion library is added. The first visit grows by 0.9 KiB gzipped (214.2 to 215.1 KiB, built on d06f7b6 with `SENTRY_AUTH_TOKEN=` empty), because the rules of the room and the form are fetched with those pages.
- Two small differences from the drawing are made for MUI: the dialog's veil has no fill after it ends, because MUI fades the backdrop out with a transition on `opacity` and a held animation would block it, and a fiesta that is already standing sways from a negative delay so that no piece holds at the end of a swing for a moment at the first frame.
- The `.cell` rules animate the box round a square, so the number and the tick of the square turn with it, as they do in the drawing.

## Not decided here

How the motion feels is for Viktor's eye on stage, as a template cannot settle it. The list of what to look at is on the release issue ([#240](https://github.com/vik8174/word-crossword-game/issues/240)) and in `docs/manual-checks.md`.
