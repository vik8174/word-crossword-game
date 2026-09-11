# 0034. One text family, and a logotype of its own

Status: Accepted

## Context

Issue #124 gave the interface three faces: a display face (Zen Old Mincho)
for the crossword's letters and the two large text levels, a sign face (Zen
Kaku Gothic New, light, tracked) for lettering, and a text face (Zen Kaku
Gothic New, regular and a bolded weight) for everything read. That choice was
made on the paper the app used to be drawn on, at a size the crossword's
squares did not yet have to answer for.

PRD #145 settled two things Viktor decided on 2026-09-08 and 2026-09-09 and
that this ticket does not reopen: **the serif is dropped**, and **the board
moves to the gothic**. The reasoning behind dropping it is a measurement
rather than a preference. The board's squares are `clamp(20px, …, 44px)`
(`board-geometry.ts`) and a letter takes 55% of a square, so the board's
letters run from about 11px to 24px. Zen Old Mincho spends its quality on
stroke contrast, and stroke contrast is the first thing a face loses at small
sizes — issue #124 measured its lowercase at 43% of its own size against the
text face's 48%, which is already a face reading shorter than the text around
it at the sizes it was chosen for; at eleven pixels the thin strokes
disappear rather than merely read small.

Once the board moves off the display face, its remaining job in the app is
four short panel headings — "In the room," "Yours to explain," "Yours to
guess," "The crossword" — and one visible `h1` on `NotFoundPage` (both `h1`s
on the nine game screens are visually hidden instead, `UNSEEN_HEADING` in
`RoomShell.tsx` and `RoomPage.tsx`). Fifteen and a half kibibytes is not a
price four headings and one landmark justify, at the size issue #124 already
measured this face as weakest in.

Separately, PRD #145's redesign round for the gate (canvas 1, issue #148)
plans a logotype — `WORD GARDEN` — standing over the gate rather than the
sentence-cased name lettered there today. Nothing in this ticket places it;
that placement, its colour and its position are issue #148's. What issue #147
owns is narrower: drop the serif, and get the logotype's face and its subset
measured and ready, so #148 is choosing a lockup rather than also choosing and
subsetting a typeface under time pressure.

## Decision

**Three faces become four roles**, all but one of them narrower jobs for a
family already fetched:

| role         | face                | weight                      | where                                                          |
| ------------ | ------------------- | --------------------------- | -------------------------------------------------------------- |
| **Logotype** | Dela Gothic One     | 400                         | the name on `home`, subset to eight glyphs, that route only    |
| **Sign**     | Zen Kaku Gothic New | 300, tracked `0.42em`, caps | step titles, the greeting on the cloth                         |
| **Text**     | Zen Kaku Gothic New | 400                         | everything read, and now the board's letters                   |
| **Heading**  | Zen Kaku Gothic New | 700                         | the four `h2` panel headings, and the two hidden/visible `h1`s |

Sign, Text and Heading are one family in three weights — the same file set
that already shipped for Sign and Text before this ticket. Heading is Text
told apart by weight alone, the same relationship Sign always had to Text.
**Only 300, 400 and 700 are ever fetched.** The family runs 300/400/500/700/900
upstream, and the interface used to ask for 600 (`WEIGHTS.semibold`), relying
on the browser's own weight-matching rule to hand it the 700 file since no 600
was ever fetched. That trick worked, but it named a weight nothing in the
family is. `WEIGHTS` is now `{ regular: 400, bold: 700 }` — the number written
down is the number a browser actually draws, and a rule naming 500 or 600 is
now a defect a test in `scale.test.ts` can catch rather than a fact a reviewer
had to remember.

**`DISPLAY_FONT_FAMILY` is deleted, not repurposed.** `GridSquare.tsx`'s letter
and its crossword number both read `TEXT_FONT_FAMILY` now — the letter
explicitly, the number explicitly as well (it would have resolved there by
inheritance regardless, but naming it is what keeps that true on purpose
rather than by accident of layout). `typography.ts`'s `displayLevel` becomes
`headingLevel`: it no longer names a family at all, the same way `textLevel`
never did, so `h1`–`h4` take the theme's own default family
(`TEXT_FONT_FAMILY`) at `WEIGHTS.bold` and nothing about their family can
drift from the rest of the app's text by being written down twice.

**The logotype is declared and subset, not wired up.** `LOGOTYPE_FONT_FAMILY`
(`'"Dela Gothic One", ' + SYSTEM_FONT_FAMILY`) and `LOGOTYPE_FONT_WEIGHT`
(400) are new exports of `scale.ts`, and `index.html` declares the
`@font-face` — but **without a preload**, the same way the sign face arrived
before anything used it (`scale.ts`'s own history says so). Nothing in the
interface names `'Dela Gothic One'` yet: the boundary this ticket was given is
that placing `WORD GARDEN` over the gate is issue #148's, and a face nothing's
CSS names is a face a browser never fetches, preload or not. Declaring it
without wiring it up is therefore not half-finished work; it is the correct
shape of "add the face, not its placement."

**The subset is cut to the name, not to latin.** `WORD GARDEN` is eight
unique letters — `W O R D G A E N` — plus the space between the two words.
Google's own latin cut of Dela Gothic One is 13,800 bytes; `pyftsubset`
against exactly those nine code points (`U+0020, U+0041, U+0044-0045, U+0047,
U+004E-004F, U+0052, U+0057`), with layout tables (`GSUB`/`GPOS`/`GDEF`) and
vertical metrics dropped since a static, ligature-free, horizontal-only
logotype needs neither, comes to **788 bytes** (811 gzipped). The subset was
estimated at "about 2 KiB" when the ticket was written, explicitly a guess
rather than a cut. The real number is under 40% of that guess — a font this
small is closer to the weight of a few lines of markup than to a typeface, and
the estimate was conservative rather than optimistic, which is the direction
an estimate should err in when nobody has cut the file yet.

## Consequences

**The measured weight, before and after, on the Deploy-style build (a
non-empty `SENTRY_AUTH_TOKEN` stamps every chunk with a debug id whether or
not the upload it triggers succeeds — ADR 0032, ADR 0033):**

|                     | CI-style (no token) | Deploy-style (a token, working or not) |
| ------------------- | ------------------- | -------------------------------------- |
| before (`1a905db`)  | 215.8 KiB           | 217.1 KiB                              |
| after (this ticket) | 201.4 KiB           | 202.6 KiB                              |
| freed               | **14.4 KiB**        | **14.5 KiB**                           |

The ticket's own estimate was a net of about 14.7 KiB (15.5 KiB freed by
dropping the serif, less roughly 0.8 KiB for the logotype subset). The
measured 14.5 KiB is close to that estimate and on the conservative side of
it, the difference being ordinary gzip-boundary noise across an `index.html`
whose comments and `@font-face` blocks both changed shape.
`FIRST_VISIT_CEILING_BYTES` (`apps/web/build/first-visit-weight.ts`) is
unchanged at 218 KiB — this ticket frees room under it rather than moving it,
exactly as ADR 0033 says freed room ought to be spent again on purpose rather
than banked as a lower ceiling.

**The board's look changes visibly, which is the point and not a
regression.** The crossword's letters move from Zen Old Mincho to Zen Kaku
Gothic New at 400. A player who has played the game before will see it.

**The four `h2` panel headings were judged by eye, not measured the way the
board was.** Viktor's own boundary in the ticket says so explicitly: if they
read badly at 700 in the text family, that is a decision for Viktor to make,
not a defect this ticket's Worker is positioned to fix by guessing at a
different weight or size. They were checked by hand in this ticket's own pull
request and found legible; anyone reading this ADR later who disagrees should
raise it as its own decision rather than editing `typography.ts` on the
strength of this paragraph.

**`WEIGHTS.semibold` is renamed to `WEIGHTS.bold` everywhere it was used** —
`h5`, `h6`, `subtitle1`, `subtitle2`, `overline` and `button` all keep the
same rendered weight (700) they already had through the old weight-matching
trick; only the name and the requested value change, from a 600 a browser
translated to a 700 it now asks for directly. No visible text on any existing
screen moves weight as a result of this rename.

**A second display face is now possible without a second display-face-shaped
mistake.** The reason Zen Old Mincho cost 15.5 KiB was that it was fetched for
latin at large, on the theory that a crossword's word list could contain any
latin letter — true, and unavoidable for a face reading arbitrary player
input. A logotype has no such obligation: it draws exactly one string, known
at build time, so subsetting it to that string rather than to latin is not a
special case invented for this ticket but the ordinary shape of what a
logotype's weight should be. `docs/decisions/0033-a-second-ceiling-for-a-picture.md`
made the same kind of distinction for a scene image paid for by one route;
this one is the same idea for a typeface paid for by one string.

**What issue #148 inherits:** a face and a subset, both measured, neither
placed. It chooses where `LOGOTYPE_FONT_FAMILY` is drawn, at what size, in
what colour, and whether the `@font-face` needs a preload once something
finally names it — at which point its weight joins the ceiling total the way
every other declared face already does (`docs/decisions/0032-what-the-first-visit-ceiling-measures.md`).
