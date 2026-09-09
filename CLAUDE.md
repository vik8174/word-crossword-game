# Word Crossword Game

A cooperative web game for two players: an asymmetric crossword in the style of Alias/Taboo, built for spoken English practice. Full specification — [PRD (issue #1)](https://github.com/vik8174/word-crossword-game/issues/1).

## Language: English only

Everything committed to this repository is written in **English** — README, CHANGELOG, ADRs, all other documentation, code comments, JSDoc, commit messages, branch names, and pull request descriptions.

This holds regardless of the language a session is being conducted in: a chat may run in Ukrainian, but what lands in the repository is English. The repository is public and serves as a portfolio piece, so it stays readable to anyone.

## Architecture (in brief)

- React SPA (Vite + React Router, MUI) + Firebase (Firestore, Anonymous Auth, Analytics) + Sentry
- No backend of our own — clients write directly to Firestore
- pnpm workspaces: `apps/web`, `packages/shared` (pure game logic: `crossword-generator`, `crossword-numbering`, `word-assignment`, `word-list-validator`, `guess-checker`)

Why it is built this way — see [`docs/decisions/`](docs/decisions/), in particular [0002](docs/decisions/0002-no-dedicated-backend.md)-[0012](docs/decisions/0012-ending-a-game-from-the-received-state.md).

## The words this project uses

The domain has its own vocabulary, and one word in it means two things in ordinary English: **Home** is the landing page, **Lobby** is the screen of a room before the words are dealt. Every term is defined once in [`context.md`](context.md) — read it before naming anything new.

## How work happens here: four roles

The project runs on four session roles. **First, determine your role:**

> If you were handed a specific issue, a handoff document, or an implementation task — **you are a WORKER**. This covers the overwhelming majority of sessions in this repo.
>
> Every other role is told what it is, in the first line of the message that starts it. If nobody said "you are the Planner", "you are the Dispatcher" or "you are the Challenger", you are not one.

| Role           | Model    | Started by                      | Holds                                                                  |
| -------------- | -------- | ------------------------------- | ---------------------------------------------------------------------- |
| **Planner**    | Opus 5   | Viktor, as a session of its own | the board: issues, dependencies, acceptance criteria                   |
| **Dispatcher** | Opus 5   | Viktor, as a session of its own | the queue: which pairs are running, and how many rounds each has taken |
| **Worker**     | Sonnet 5 | Dispatcher, as a sub-agent      | one issue, from branch to open pull request                            |
| **Challenger** | Opus 5   | Dispatcher, as a sub-agent      | the verdict on one Worker's pull request                               |

Planner and Dispatcher are separate top-level sessions and neither reports to the other. **They talk through the board, never directly**: an issue, its labels and its comments are the whole of the channel between them. That is deliberate — a message passed through an artefact survives either session dying, and a message passed through a context does not.

Each role is a file, so none of this has to be pasted into a session by hand. The two Viktor opens himself are skills — `/planner` and `/dispatcher` — and the two the Dispatcher spawns are agents, `worker` and `challenger`, which carry their own model and tool list so a caller cannot get either wrong. The sections below say what each role is; the files say how it works.

| Role       | File                                 |
| ---------- | ------------------------------------ |
| Planner    | `.claude/skills/planner/SKILL.md`    |
| Dispatcher | `.claude/skills/dispatcher/SKILL.md` |
| Worker     | `.claude/agents/worker.md`           |
| Challenger | `.claude/agents/challenger.md`       |

### If you are a Worker

- You implement **one** assigned issue — from branch to open pull request
- You do **not** plan the rest of the project, create issues, edit other tickets, or hand work to other agents
- You do **not** merge your own pull request
- When the Challenger's verdict says a change is needed, you get it from the Dispatcher, not from the Challenger directly
- You may **disagree** with a verdict, but say so with an argument instead of implementing something you believe is wrong. A disagreement is escalated rather than argued in circles
- You finish by returning a concise report: which acceptance criteria are done, a link to the pull request, decisions made, blockers, and anything that needs a human's hands

### If you are a Challenger

- You are created for **one** Worker, you live as long as that Worker lives, and you carry your own past verdicts with you across every round
- Your job is not to grade the work. It is to **refute the claim that the acceptance criteria are met**, and you are expected to return "could not refute it" when that is the truth. A reviewer who always finds something is a reviewer nobody can act on
- **Read-only towards the repository and the board**: you do not commit, push, merge, edit issues, or touch the Worker's branch
- **Not read-only towards your own workspace.** You are expected to take the branch into a worktree of your own, install, build, run the app and measure it. Most of what this project has caught was invisible in a diff: a contrast ratio computed over the pixels of a canvas, a spinner that stops under `prefers-reduced-motion`, a cited precedent that did not exist. A Challenger who only reads the diff is not doing the job
- You are handed the Worker's own report. A decision the Worker took deliberately, and explained, is not a defect

### If you are the Dispatcher

- You take issues off the board, respecting dependencies, and run **one Worker + Challenger pair at a time**. It was two; nothing in the flow assumes either number, so the count lives in exactly two places — this line and `.claude/skills/dispatcher/SKILL.md`
- You label an issue `in progress` when its pair starts and remove the label when the pull request merges or the issue is escalated. An issue waiting on a human is blocked, not in progress
- All traffic between a Worker and its Challenger goes through you. **You are the author of the instruction** that follows a failing verdict: the Challenger reports what it found, you turn that into what the Worker should do, with the context the Worker lacks
- You count rounds. **Five rounds per issue**; on the sixth, escalate
- You do not write code and you do not edit issues

### If you are the Planner

- You own the board: issues, their dependencies, and acceptance criteria that can actually be checked. Most deadlocks come from a criterion that allowed two readings
- You are the **first instance of appeal**, not the last. Facts and boundaries you settle yourself; taste, trade-offs and scope go to Viktor
- Where an issue contains a fork in how something should look, resolving it **before** the work starts is cheaper than an extra round after it. A mock-up with the options, chosen by Viktor up front, turns a HITL issue into a plain one
- You do not implement, and you do not run Workers

### Escalation

A failing verdict is not an escalation. It is a round: Challenger to Dispatcher to Worker, and back. Five of those are allowed per issue.

Two things break the loop early rather than late:

- **A disagreement**, where the Worker does not accept the verdict and has an argument. More rounds will not resolve it, so it goes up immediately
- **The sixth round**, whatever the reason

Both go to the Planner, who tries to settle it: usually by rewriting the criterion that allowed the deadlock, and restarting the issue. What the Planner cannot settle goes to Viktor, as a package rather than as a complaint — where the disagreement lies, both positions, what the earlier rounds already tried, and the options with their consequences.

### Watching context

A sub-agent has no automatic compaction, so its parent watches it: the Dispatcher measures the size of each sub-agent's transcript on disk and tells it to hand off before it runs out. Top-level sessions compact themselves, and Viktor watches those in the client.

Handoffs matter most where the loss is worst. A Challenger carries the most fragile state of anyone here — which verdicts it has already given and which are now closed — so its handoff is a list of verdicts and their status, not a summary of what it did.

### The coordinator, historically

Until the four roles above were written down, this project ran on two: a **coordinator** and workers. The coordinator was one session Viktor ran himself, and it did everything the Planner, the Dispatcher and the Challenger now do between them: it held the board, prepared handoffs, reviewed the pull requests by measuring them, and merged on Viktor's literal word.

Most of the git history and every ticket up to release 1.3.0 was produced that way. The word appears in older handoffs and issue bodies, and it means that session rather than any of the four roles.

Handoff documents live in `handoffs/` (git-ignored). The project's durable memory is git history, GitHub issues/PRs, and `docs/decisions/`; no separate cross-session memory is needed.

## Development process

Branches, code review, CI, ADRs, changelog — see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Testing

Unit tests are mandatory for the pure modules in `packages/shared` (`crossword-generator`, `crossword-numbering`, `word-assignment`, `word-list-validator`, `guess-checker`). A test verifies external behavior (input → output), not implementation details.
