# 0032. What the first-visit ceiling measures

Status: Accepted

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
