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

## CI (GitHub Actions)

Opening or updating a pull request against `main` automatically runs:

- **Lint** — ESLint + Prettier
- **Test** — unit tests (Vitest)
- **Coverage** — 80% threshold; a pull request below it cannot be merged
- **Build** — `pnpm build` for both packages

All four are required status checks in branch protection. A pull request cannot be merged until they are green. The workflow also runs on `push` to `main`, so the state of `main` is verified after every merge.

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
