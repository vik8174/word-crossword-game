# Contributing

## Language: English only

Everything technical is written in **English**, without exception: everything committed (documentation, code, comments, commit messages, branch names), everything on GitHub (issues, pull requests, and every comment on either), and everything the working sessions write for each other (reports, verdicts, round records, handoff documents). A working session may talk to a person in any language; everything it writes down is English.

## Branch → PR → Merge

- Branch names follow `type/short-description` (`feat/`, `fix/`, `chore/`, `refactor/`, `test/`, `docs/`)
- **Never commit directly to `main`** — the only exception was the initial bootstrap commit of the empty repository
- Every change goes through a pull request into `main`
- `main` is protected: direct pushes are rejected, a pull request is required

## Before opening a pull request

1. Self-review: `git diff`
2. Code review: run the `code-reviewer` agent (zero-context review against `~/.claude/rules/code-review.md`) and address Critical/Important findings
3. Linting, tests, and the coverage check must pass locally
4. If the change touches `firestore.rules`, run `pnpm test:rules` locally as well — CI runs it too, but the emulator is slower to fail than you are
5. Whatever needed a pair of eyes rather than an assertion, check by hand — and before a release check by hand from [`docs/manual-checks.md`](docs/manual-checks.md) rather than from memory, which is how the same check kept being reinvented, differently, in every ticket

## Storybook

Run `pnpm --filter web storybook` to see a component or a page on its own, outside a running room. `pnpm --filter web build-storybook` is what the **Build** job in CI runs; it is not a check of its own.

## CI (GitHub Actions)

Opening or updating a pull request against `main` automatically runs:

- **Lint** — ESLint + Prettier
- **Test** — unit tests (Vitest)
- **Coverage** — 80% threshold; a pull request below it cannot be merged
- **Build** — `pnpm build` for both packages
- **Rules** — `pnpm test:rules`: `firestore.rules` checked against the Firestore emulator (needs a JDK, which the job installs)
- **E2E** — `pnpm test:e2e`: a real browser against the app and the Firebase emulators
- **Visual** — `pnpm test:visual`: every Storybook story at 1440, 834 and 375 px, compared with the committed baselines in `apps/web/visual/baselines/`

The first five are required status checks in branch protection. A pull request cannot be merged until they are green.

## Visual regression

The **Visual** job screenshots every story and fails when a shot differs from its baseline by more than `maxDiffPixelRatio` (`apps/web/playwright.visual.config.ts`, one value for every shot). A failed run uploads the expected, actual and diff images as the `visual-diffs` artifact, kept 14 days.

**The setting, and what it was measured against.** The per-pixel `threshold` is Playwright's default 0.2 and `maxDiffPixelRatio` is **0.001**. Measured on the Visual job on unchanged commits: five runs at this setting had a largest ratio of 6.6e-6 (one shot of 2 pixels in four runs, none in the fifth), and the threshold is more than 100 times that. The ratio was also read against deliberate regressions: one pixel of padding on the main button gave a largest ratio of 2.7e-3, and one hidden button kind 2.3e-3, both above 0.001, so both fail the job.

**A known blind spot.** The per-pixel threshold 0.2 is a colour distance, and a change of 8 in one colour channel (the page colour `duck` from `#E6EEEC` to `#EEEEEC` was tried) is far below it: **no pixel is counted and the job passes.** A colour change of that size is not caught by Visual. It was measured with `threshold: 0` as well, and that setting does catch it (ratios 0.35 to 1.0), but its noise did not hold: five runs on one unchanged commit had a largest ratio of 8.9e-5, 6.9e-5, 7.9e-5, 5.9e-5 and 6.5e-4 (the last one is a 198-pixel difference in one shot), and the fifth is above 1e-4, so the stricter setting was not adopted. Review colour changes by eye.

**A pull request that changes the look updates its baselines in the same pull request.** Baselines are rendered **only by CI**, in the Visual job's image (`mcr.microsoft.com/playwright:v<version>-noble`, the Playwright version of `apps/web/package.json`) on GitHub's amd64 runner. Never make one on your machine and never commit one that you did: a Mac's fonts differ, and an emulated amd64 image rendered the pages without their MUI styles. No workflow commits anything.

1. Push the change. **Visual** fails on every shot that moved, and on every new story that has no baseline yet.
2. Run `pnpm test:visual:accept <run-id>` (the number in the run's URL; it needs the `gh` CLI, signed in). It downloads the `visual-diffs` artifact and writes the `actual` image of every failed shot into `apps/web/visual/baselines/`.
3. Look at the changed PNGs in the diff: a baseline that changed is a change of the look, and it must be the one the pull request meant. Commit and push them. **Visual** is green on the new commit.

`pnpm test:visual` also runs the check locally, but a local render is never a baseline: expect it to differ from CI's. A new story fails until its three baselines are committed. A story that shows the time or a random layout must be made deterministic. When Playwright is upgraded, the image tag in the **Visual** job moves with it (a step fails the job if they differ) and every baseline is taken again the same way.

## Deploying (GitHub Actions)

`.github/workflows/deploy.yml` is what puts the app anywhere, and nothing else does:

- **A merge to `main`** deploys to **stage**, with no command from anybody
- **A `v*` tag** deploys to **production**

Both first re-run linting, the tests with their coverage threshold and the rules checks — on the exact commit being deployed, which for a tag is a commit no pull request ever had as its head. That is also why `ci.yml` no longer runs on `push` to `main`: the state of `main` is verified by the deploy, not twice.

A deploy publishes the app and `firestore.rules` together, and never gets cancelled halfway — a second push waits rather than killing the first. How the two environments are kept apart, and what has to be set up by hand for one to exist, is in [ADR 0020](docs/decisions/0020-two-environments-and-a-deploy-that-runs-itself.md) and in the [Deployment section of `README.md`](README.md#deployment).

## Releasing

The whole order of a release — what a version is, which files carry it, when the tag goes on and what is checked afterwards — is in [`docs/releasing.md`](docs/releasing.md), and only there. A release is rare enough that nobody remembers it, so it is written down once rather than described in three places that would drift apart.

## Architecture decisions (ADRs)

Every architecturally significant or hard-to-reverse decision gets its own file in [`docs/decisions/`](docs/decisions/), following the `0000-template.md` format. See [ADR 0001](docs/decisions/0001-record-architecture-decisions.md).

Add the ADR in the same pull request that makes the architectural change — not in a separate follow-up.

## Templates

A visual issue — one whose outcome is visible on a screen — is drawn before it is built. The drawing is a **Template**: source in `design/templates/<name>.html`, committed, and published as a Claude artifact from that same file. It is merged to `main` in a pull request of its own, `design/<name>`, once Viktor approves it — a template is a drawing, not an implementation, and his approval is its review. A visual issue is not ready until its template is on `main`, and it links both the path and the artifact URL. This is a different thing from [`docs/decisions/0000-template.md`](docs/decisions/0000-template.md), the ADR skeleton — the two share a word and nothing else. See [ADR 0035](docs/decisions/0035-a-visual-issue-is-built-to-a-template.md).

## Changelog

Every user-facing pull request adds a line to the `[Unreleased]` section of [`CHANGELOG.md`](CHANGELOG.md), following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Working process: TRIAL

Work moves through TRIAL, a loop in which one claim passes between its seats: _the acceptance criteria are met_. The loop exists to try to refute that claim. A session starts it with `/trial`. The seats, their counts and the levels are defined in the global TRIAL files, and [`CLAUDE.md`](CLAUDE.md) holds this project's own contract: the commands, the checks, the ports and the risk floor.

If a session was handed an issue or a handoff document, it is a Worker, and it does not merge its own pull request.

The loop was called the Adversarial Review Loop (ARL) before, and its roles Planner, Dispatcher, Worker and Challenger before that. Those names are left standing in the git history and in `docs/decisions/`.
