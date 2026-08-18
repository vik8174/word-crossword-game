# Contributing

## Language: English only

Everything committed to this repository is written in **English** — README, CHANGELOG, ADRs, all other documentation, code comments, JSDoc, commit messages, branch names, and pull request descriptions. A working session may be conducted in any language, but what lands in the repository is English.

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

## CI (GitHub Actions)

Opening or updating a pull request against `main` automatically runs:

- **Lint** — ESLint + Prettier
- **Test** — unit tests (Vitest)
- **Coverage** — 80% threshold; a pull request below it cannot be merged
- **Build** — `pnpm build` for both packages
- **Rules** — `pnpm test:rules`: `firestore.rules` checked against the Firestore emulator (needs a JDK, which the job installs)

All five are required status checks in branch protection. A pull request cannot be merged until they are green.

## Deploying (GitHub Actions)

`.github/workflows/deploy.yml` is what puts the app anywhere, and nothing else does:

- **A merge to `main`** deploys to **stage**, with no command from anybody
- **A `v*` tag** deploys to **production**

Both first re-run linting, the tests with their coverage threshold and the rules checks — on the exact commit being deployed, which for a tag is a commit no pull request ever had as its head. That is also why `ci.yml` no longer runs on `push` to `main`: the state of `main` is verified by the deploy, not twice.

A deploy publishes the app and `firestore.rules` together, and never gets cancelled halfway — a second push waits rather than killing the first. How the two environments are kept apart, and what has to be set up by hand for one to exist, is in [ADR 0020](docs/decisions/0020-two-environments-and-a-deploy-that-runs-itself.md) and in the [Deployment section of `README.md`](README.md#deployment).

## Releasing

The version lives in one place — the `version` field of the root `package.json` — and a tag has to name it. To cut a release:

1. In a pull request: bump `version` in the root `package.json`, and turn the `[Unreleased]` section of `CHANGELOG.md` into a numbered one with today's date, leaving a fresh empty `[Unreleased]` above it. Known limitations that ship with the release are named there rather than left for whoever plays it to find
2. Merge it, and let the stage deploy go green
3. Tag that commit `v<version>` and push the tag: `git tag v1.0.0 && git push origin v1.0.0`

A tag that does not match the version in `package.json` deploys nothing and says so — the release job checks the pair before it builds. Move the tag or bump the version and push again.

## Architecture decisions (ADRs)

Every architecturally significant or hard-to-reverse decision gets its own file in [`docs/decisions/`](docs/decisions/), following the `0000-template.md` format. See [ADR 0001](docs/decisions/0001-record-architecture-decisions.md).

Add the ADR in the same pull request that makes the architectural change — not in a separate follow-up.

## Changelog

Every user-facing pull request adds a line to the `[Unreleased]` section of [`CHANGELOG.md`](CHANGELOG.md), following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Working process: coordinator + workers

The project runs on a coordinator + workers model (see [`CLAUDE.md`](CLAUDE.md) for the full description, including how a session determines its own role):

- **Worker** — a session handed one specific issue. It implements exactly that issue up to an open pull request, plans nothing beyond it, does not merge its own pull request, and finishes with a concise report. Model: Sonnet 5
- **Coordinator** — one separate session Viktor runs himself. It does not implement tickets; it prepares handoffs, verifies reports, and decides what comes next. Model: Opus 5

If a session was handed an issue or a handoff, it is a worker, not the coordinator.
