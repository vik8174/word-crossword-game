# Word Crossword Game

A cooperative web game for 2-4 players: an asymmetric crossword in the style of Alias/Taboo, built for spoken English practice. Full specification — [PRD (issue #1)](https://github.com/vik8174/word-crossword-game/issues/1).

## Language: English only

Everything committed to this repository is written in **English** — README, CHANGELOG, ADRs, all other documentation, code comments, JSDoc, commit messages, branch names, and pull request descriptions.

This holds regardless of the language a session is being conducted in: a chat may run in Ukrainian, but what lands in the repository is English. The repository is public and serves as a portfolio piece, so it stays readable to anyone.

## Architecture (in brief)

- React SPA (Vite + React Router, MUI) + Firebase (Firestore, Anonymous Auth, Analytics) + Sentry
- No backend of our own — clients write directly to Firestore
- pnpm workspaces: `apps/web`, `packages/shared` (pure game logic: `crossword-generator`, `word-assignment`, `word-list-validator`, `guess-checker`)

Why it is built this way — see [`docs/decisions/`](docs/decisions/), in particular [0002](docs/decisions/0002-no-dedicated-backend.md)-[0008](docs/decisions/0008-crossword-layout-library-and-contract.md).

## How work happens here: coordinator + workers

The project runs on two distinct session roles. **First, determine your role:**

> If you were handed a specific issue, a handoff document, or an implementation task — **you are a WORKER**. This covers the overwhelming majority of sessions in this repo.
>
> The coordinator is exactly one separate session that Viktor runs himself. If you were not explicitly told "you are the coordinator", you are not it.

### If you are a worker

- You implement **one** assigned issue — from branch to open pull request
- You do **not** plan the rest of the project, create issues, edit other tickets, hand work to other agents, or spawn sub-agents to implement things (the one exception is the `code-reviewer` agent on your own diff, which the process requires)
- You do **not** merge your own pull request — Viktor reviews and merges it
- You finish by returning a concise report: which acceptance criteria are done, a link to the pull request, decisions made, blockers, and anything that needs a human's hands
- Model for worker sessions: **Sonnet 5**

### If you are the coordinator

- You do not implement tickets yourself — you hold the overall state, pick the next issue, prepare handoffs, and verify worker reports
- After a worker reports, you update project state (issues, ADRs as needed) and prepare the next handoff
- Model for the coordinator: **Opus 5**

Handoff documents live in `handoffs/` (git-ignored). The project's durable memory is git history, GitHub issues/PRs, and `docs/decisions/`; no separate cross-session memory is needed.

## Development process

Branches, code review, CI, ADRs, changelog — see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Testing

Unit tests are mandatory for the pure modules in `packages/shared` (`crossword-generator`, `word-assignment`, `word-list-validator`, `guess-checker`). A test verifies external behavior (input → output), not implementation details.
