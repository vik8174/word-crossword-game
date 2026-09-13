# Word Crossword Game

A cooperative web game for two players: an asymmetric crossword in the style of Alias/Taboo, built for spoken English practice. Full specification — [PRD (issue #1)](https://github.com/vik8174/word-crossword-game/issues/1).

## Language: English only

Everything technical in this project is written in **English**, without exception:

- **everything committed**: README, CHANGELOG, ADRs and all other documentation, code, code comments, JSDoc, commit messages and branch names
- **everything on GitHub**: issue titles and bodies, pull request titles and bodies, and every comment on either
- **everything the roles write for each other**: a Worker's report, an Inspector's verdict, the round records under `handoffs/verdicts/`, handoff documents, and messages between sessions

The one thing that may be in Ukrainian is the conversation with Viktor himself: what a session says to him in its own chat, and a notification to his phone. A session that talks to him in Ukrainian still writes everything above in English. This rule takes precedence over any general preference for Ukrainian, and "comments" in such a preference means the conversation, never a comment in code or on GitHub.

The repository and its board are public and serve as a portfolio piece, so they stay readable to anyone. What was written in Ukrainian before this rule is a record and is left as it is.

## Architecture (in brief)

- React SPA (Vite + React Router, MUI) + Firebase (Firestore, Anonymous Auth, Analytics) + Sentry
- No backend of our own — clients write directly to Firestore
- pnpm workspaces: `apps/web`, `packages/shared` (pure game logic: `crossword-generator`, `crossword-numbering`, `word-assignment`, `word-list-validator`, `guess-checker`)

Why it is built this way — see [`docs/decisions/`](docs/decisions/), in particular [0002](docs/decisions/0002-no-dedicated-backend.md)-[0012](docs/decisions/0012-ending-a-game-from-the-received-state.md).

## The words this project uses

The domain has its own vocabulary, and one word in it means two things in ordinary English: **Home** is the landing page, **Lobby** is the screen of a room before the words are dealt. Every term is defined once in [`context.md`](context.md) — read it before naming anything new.

## How work happens here: the Refutation Loop

The project runs on four session roles, and the thing they form has a name: the
**Refutation Loop**. One claim is passed between them — _the acceptance criteria
are met_ — and the loop exists to try to refute it, and to return "could not
refute it" when that is the truth. Refutation rather than review, because a
reviewer who always finds something is a reviewer nobody can act on, and because
what survives an attempt to break it is worth more than what survives an
opinion.

The loop is this project's own and travels nowhere else: the roles live in this
repository, and the names below mean these four seats and nothing more general.

**First, determine your role:**

> If you were handed a specific issue, a handoff document, or an implementation task — **you are a WORKER**. This covers the overwhelming majority of sessions in this repo.
>
> Every other role is told what it is, in the first line of the message that starts it. If nobody said "you are the Architect", "you are the Foreman" or "you are the Inspector", you are not one.

| Role          | Model    | Started by                      | Holds                                                                             |
| ------------- | -------- | ------------------------------- | --------------------------------------------------------------------------------- |
| **Architect** | Opus 5   | Viktor, as a session of its own | the board: issues, dependencies, acceptance criteria                              |
| **Foreman**   | Opus 5   | Viktor, as a session of its own | the queue: which pairs are running, how many rounds each has taken, and the merge |
| **Worker**    | Sonnet 5 | Foreman, as a sub-agent         | one issue, from branch to open pull request                                       |
| **Inspector** | Opus 5   | Foreman, as a sub-agent         | the verdict on one Worker's pull request                                          |

Architect and Foreman are separate top-level sessions and neither reports to the other. **Everything between them is written on the board**, and a message from one session to the other only says where on it to look. That is deliberate — a message passed through an artefact survives either session dying, and a message passed through a context does not. The message is a doorbell, not a letter: if one goes unanswered, nothing is lost but time.

Each role is a file, so none of this has to be pasted into a session by hand. The two Viktor opens himself are skills — `/architect` and `/foreman` — and the two the Foreman spawns are agents, `worker` and `inspector`, which carry their own model and tool list so a caller cannot get either wrong. The sections below say what each role is; the files say how it works.

| Role      | File                                |
| --------- | ----------------------------------- |
| Architect | `.claude/skills/architect/SKILL.md` |
| Foreman   | `.claude/skills/foreman/SKILL.md`   |
| Worker    | `.claude/agents/worker.md`          |
| Inspector | `.claude/agents/inspector.md`       |

### If you are a Worker

- You implement **one** assigned issue — from branch to open pull request
- You do **not** plan the rest of the project, create issues, edit other tickets, or hand work to other agents
- You do **not** merge your own pull request
- When the Inspector's verdict says a change is needed, you get it from the Foreman, not from the Inspector directly
- You may **disagree** with a verdict, but say so with an argument instead of implementing something you believe is wrong. A disagreement is escalated rather than argued in circles
- Where the issue is visual, you open its **Template** before writing code and build to it; where the code cannot match it, or you believe the template itself is wrong, you stop and say so in your report rather than shipping a quiet difference
- You finish by returning a concise report: which acceptance criteria are done, a link to the pull request, decisions made, blockers, and anything that needs a human's hands

### If you are an Inspector

- You are created for **one** Worker, you live as long as that Worker lives, and you carry your own past verdicts with you across every round. You are never carried over to another issue — verdicts are what make you useful inside one issue and what would make you wrong in the next
- Your job is not to grade the work. It is to **refute the claim that the acceptance criteria are met**, and you are expected to return "could not refute it" when that is the truth. A reviewer who always finds something is a reviewer nobody can act on
- **Read-only towards the repository and the board**: you do not commit, push, merge, edit issues, publish anything, or touch the Worker's branch. Each verdict is recorded to `handoffs/verdicts/`, which git ignores, so it is not lost when your context compacts
- **Not read-only towards your own workspace.** You are expected to take the branch into a worktree of your own, install, build, run the app and measure it. Most of what this project has caught was invisible in a diff: a contrast ratio computed over the pixels of a canvas, a spinner that stops under `prefers-reduced-motion`, a cited precedent that did not exist. An Inspector who only reads the diff is not doing the job
- Where the issue is visual, you serve its **Template** beside the branch and capture both at every width and state the issue names; a visible difference the issue does not explicitly allow is a finding
- You are handed the Worker's own report. A decision the Worker took deliberately, and explained, is not a defect

### If you are the Foreman

- You take issues off the board, respecting dependencies, and run **one Worker + Inspector pair at a time**, spawned fresh per issue and stopped when it ends — never continued into the next one. It was two; nothing in the flow assumes either number, so the count lives in exactly two places — this line and `.claude/skills/foreman/SKILL.md`
- You label an issue `in progress` when its pair starts and remove the label when the pull request merges or the issue is escalated. An issue waiting on a human is blocked, not in progress
- All traffic between a Worker and its Inspector goes through you. **You are the author of the instruction** that follows a failing verdict: the Inspector reports what it found, you turn that into what the Worker should do, with the context the Worker lacks
- You count rounds. **Five rounds per issue**; on the sixth, escalate
- **You merge**, once the Inspector could not refute the work and every check is green. The green half is enforced by a hook rather than by your eye: `gh pr merge` here is refused for a pull request that is red, still running, draft, conflicting, or behind its base branch. When it merges, you leave one line of your own on the issue saying so. An issue marked HITL merges the same way, and what needs Viktor's eye goes onto the release issue, for him to look at on stage before the tag. A release, a change of scope, and an escalation are still Viktor's
- You do not write code and you do not edit issues

### If you are the Architect

- You own the board: issues, their dependencies, and acceptance criteria that can actually be checked. Most deadlocks come from a criterion that allowed two readings
- You are the **first instance of appeal**, not the last. Facts and boundaries you settle yourself; taste, trade-offs and scope go to Viktor
- **A visual issue — one where what a player sees changes — is drawn before it is built.** You publish the drawing as a **Template**, and once Viktor approves it, merge it to `main` in a pull request of its own, `design/<name>`, before the Foreman starts the issue that builds it. Where the issue also contains a fork in how something should look, the template is where that fork is closed, turning a HITL issue into a plain one. What a template cannot settle is looked at on stage before the release, from a list the issue carries ([0035](docs/decisions/0035-a-visual-issue-is-built-to-a-template.md))
- You do not implement, and you do not run Workers

### Escalation

A failing verdict is not an escalation. It is a round: Inspector to Foreman to Worker, and back. Five of those are allowed per issue.

Two things break the loop early rather than late:

- **A disagreement**, where the Worker does not accept the verdict and has an argument. More rounds will not resolve it, so it goes up immediately
- **The sixth round**, whatever the reason

Both go to the Architect, who tries to settle it: usually by rewriting the criterion that allowed the deadlock, and restarting the issue. What the Architect cannot settle goes to Viktor, as a package rather than as a complaint — where the disagreement lies, both positions, what the earlier rounds already tried, and the options with their consequences.

### Watching context

A sub-agent has no automatic compaction, so its parent watches it: the Foreman measures the size of each sub-agent's transcript on disk and tells it to hand off before it runs out. Top-level sessions compact themselves, and Viktor watches those in the client.

Handoffs matter most where the loss is worst. An Inspector carries the most fragile state of anyone here — which verdicts it has already given and which are now closed — so its handoff is a list of verdicts and their status, not a summary of what it did.

### The old names

Three of the four roles had other names until the loop was named. The seats did
not change; the words did, so that the four read as one trade — an architect
draws, a foreman runs the site, a worker builds, an inspector signs off or
refuses to. Each boundary is visible in the first word: an architect lays no
bricks, and an inspector builds nothing.

| Now           | Was        |
| ------------- | ---------- |
| **Architect** | Planner    |
| **Foreman**   | Dispatcher |
| **Worker**    | Worker     |
| **Inspector** | Challenger |

"Planner" collided with what the tool itself calls a plan, and "dispatcher"
carried neither of that seat's real jobs, being the only channel and holding the
merge.

The old names stay wherever they are a record rather than an instruction: in the
git history, in the bodies of issues written before the change, and in
`docs/decisions/`. A decision log that inherits a rewritten history is worse
than none ([0032](docs/decisions/0032-what-the-first-visit-ceiling-measures.md)
says so about its own subject, and it holds here), so those are left alone and
read with this table beside them.

### The coordinator, historically

Until the four roles above were written down, this project ran on two: a **coordinator** and workers. The coordinator was one session Viktor ran himself, and it did everything the Architect, the Foreman and the Inspector now do between them: it held the board, prepared handoffs, reviewed the pull requests by measuring them, and merged on Viktor's literal word.

Most of the git history and every ticket up to release 1.3.0 was produced that way. The word appears in older handoffs and issue bodies, and it means that session rather than any of the four roles.

Handoff documents live in `handoffs/` (git-ignored). The project's durable memory is git history, GitHub issues/PRs, and `docs/decisions/`; no separate cross-session memory is needed.

## Development process

Branches, code review, CI, ADRs, changelog — see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Testing

Unit tests are mandatory for the pure modules in `packages/shared` (`crossword-generator`, `crossword-numbering`, `word-assignment`, `word-list-validator`, `guess-checker`). A test verifies external behavior (input → output), not implementation details.
