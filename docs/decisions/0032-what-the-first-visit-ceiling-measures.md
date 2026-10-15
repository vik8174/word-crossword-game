# 0032. What the first-visit ceiling measures

Status: Accepted

**Split in two by [0033](0033-a-second-ceiling-for-a-picture.md), and whole
again by [0038](0038-across-the-street-replaces-the-garden.md).** This ceiling
still measures exactly what it measures here — the HTML, the chunks and the
typefaces. For a time it was not the only one: a raster scene image was weighed
against a ceiling of its own, because a painting and a script are not the same
kind of cost. The pictures are gone, and so is that ceiling.

## Context

A first visit to the landing page may not weigh more than a number written down in `apps/web/build/first-visit-weight.ts`, and a build that goes over it fails. The gate arrived with the garden ([#118](https://github.com/vik8174/word-crossword-game/issues/118)) at 210 KiB, because that is the release that put a painting behind the app and two typefaces in front of it, and it was the first release where a screenshot could cost a hundred kilobytes without anybody noticing.

[#124](https://github.com/vik8174/word-crossword-game/issues/124) raised it to 218, and that is the first time it has moved. A number nobody has ever had to argue with is not yet a rule, so this is the record of what it is for — written now rather than at the second raise, when the shape of the argument would already have been set by whatever happened this time.

**What forced it.** Everything read in this app was drawn in whatever font the reader's operating system held — SF Pro, Segoe UI — beside two faces chosen on purpose. Choosing the third is not a font question with a byte cost attached; it is the byte cost, and every candidate but one was a question about this number:

| Candidate                                     | New bytes | First visit |
| --------------------------------------------- | --------- | ----------- |
| The system stack, unchanged                   | 0         | 197.3 KiB   |
| Zen Old Mincho, one weight — already paid for | 0         | 197.3 KiB   |
| Zen Kaku Gothic New, 400 + 700                | 19.0 KB   | 216.3 KiB   |
| Zen Maru Gothic, 400 + 700                    | 22.7 KB   | 220.0 KiB   |

Text wants two weights and no face worth having offers two for the twelve kibibytes that were left. The one free candidate was measured rather than assumed: Zen Old Mincho stands 15% lower at the lowercase than a system sans, which is the thing `scale.ts` had asserted about it for two releases without a number behind it.

## Decision

**The ceiling is 218 KiB, and it measures the landing page.** Not a room, not the game screen: the address a stranger opens first, and everything the HTML asks for before a line of the app runs. Every declared `@font-face` counts against it whether or not it is preloaded, which is deliberate — otherwise a typeface becomes free by having its `<link>` deleted.

**218 rather than 217, because the build that is checked is not the build that ships.** The `Build` step in `ci.yml` runs without `SENTRY_AUTH_TOKEN`; `deploy.yml` runs with it, and `sentryVitePlugin` then uploads source maps and stamps debug ids into the chunks. On one commit, measured both ways: **215.2 KiB in CI, 216.7 locally with the token**. The heavier one is what a player fetches. A ceiling set a few tenths above what CI weighs would be no ceiling at all for what ships, and gzip moves by more than a few tenths between releases on chunks nobody touched.

**Raising it is a pull request with a reason, and from now on an ADR.** `first-visit-weight.test.ts` asserts the number itself, so that raising it shows up in a diff as a decision rather than as a constant that drifted. This file is the second half of that: the test makes the change visible, the record says what would justify one.

**It is not a budget to spend.** Room under the ceiling is room for the difference between the two builds and for gzip's own noise. Work that finds itself with kilobytes to spare should leave them there.

## Consequences

**The margin is thinner than the number suggests.** 2.8 KiB against the build CI weighs, **1.3 KiB against the build a player gets**. The next thing that wants bytes on the landing page will have to earn them by taking something out, not by finding slack.

**The gap between the two builds is a real defect, and it is not fixed here.** It has been there since source-map upload arrived, and it was invisible while the margin was wide. It also explains something this project had already misdiagnosed: two tickets in a row reported weights that disagreed with the CI log by the same ~1.5 KiB, and the accepted explanation — that workers measured before their last commit — was wrong. They were measuring locally, with a token in `.env`. Closing the gap is its own ticket; until then, a weight is only meaningful together with which build produced it.

**Three faces are now fetched on a page that reads none of them.** The landing page is lettering only: the name over the gate and the one button are the sign face. The text face is preloaded all the same, because `/create` is the screen after it, and a face arriving once that screen is laid out moves a paragraph somebody has begun reading — measured at 19.5 pixels. That is a real cost paid by everyone who opens the landing page and goes no further, accepted knowingly.

**178 was never a ceiling.** The comment in `first-visit-weight.ts` reads as though the number has been raised twice, from 178 to 210 to 218. There was no such constant before [#118](https://github.com/vik8174/word-crossword-game/issues/118): 178 was what a first visit weighed before the garden, not a limit anything was held to. The comment is corrected alongside this record, because a decision log that inherits a wrong history is worse than none.

## Addendum (2026-10-15, [#263](https://github.com/vik8174/word-crossword-game/issues/263)): the latin italic is no longer part of the first visit

**What changed.** The latin italic face (`alegreya-sans-v28-latin-400italic.woff2`) is no longer preloaded, and the first-visit check no longer counts it. The check still weighs it and prints it on a line of its own ("Not on the first visit: ..."), so its cost stays visible. The ceiling stays at 218 KiB. Viktor chose this way on 2026-10-15, with two others turned down: raising the ceiling, and deferring Sentry.

**Why.** The landing page draws no italic. Italic text is drawn by the explained squares, the lobby, the endings, the street cards and the info glyph of a message, and each of those fetches the file when it first draws it. The first visit was at 215.1 KiB of 218.0 when the lesson issues ([#234](https://github.com/vik8174/word-crossword-game/issues/234) to [#236](https://github.com/vik8174/word-crossword-game/issues/236)) had not started, and the italic is 17.3 KiB of it. The cost moves to the moment a screen draws italic text, which may show in the regular face for a moment before the italic arrives.

**The rule, and its order.** The check reads a list, `NOT_ON_FIRST_VISIT`, exported from `apps/web/build/first-visit-weight.ts`. It holds the latin italic alone. For each face the HTML declares:

1. A face that the HTML preloads counts against the first visit, whatever the list says.
2. A face that is on the list and is not preloaded is weighed and reported on its own line, and counts against no ceiling.
3. Every other declared face counts, as before.

**The guard holds.** This ADR said that every declared face counts "whether or not it is preloaded", so that a typeface does not become free by having its `<link>` deleted. That is still true for every face that is not on the list. Deleting a preload without adding the face to the list leaves the face counted. A face on the list that someone preloads again counts again, because a preload fetches the file with the first visit. Adding a face to the list is a pull request that changes this file and its test, and so is a decision made on purpose.

**How this sits beside the second ceiling.** [#232](https://github.com/vik8174/word-crossword-game/issues/232) counts the latin-ext faces against a second ceiling of 60 KiB, by their unicode range. A face on `NOT_ON_FIRST_VISIT` is outside both ceilings, and #232 inherits this rule in the same order. The latin-ext italic is not on the list, so it is counted by its range.

**The figures.** Measured by `SENTRY_AUTH_TOKEN= pnpm exec vite build` in `apps/web`, with `apps/web/.env` present: **215.1 KiB** on `295c78e` before this change and **198.0 KiB** after it (the CI build, which has no token). A production build is about 1.7 KiB heavier (the debug ids of the source-map upload), so **216.8** before and about **199.7** after.
