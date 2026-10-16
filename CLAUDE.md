# Across the Street

A cooperative web game for two players: an asymmetric crossword in the style of Alias/Taboo, built for spoken practice of any language written in Latin letters (the repository is still named `word-crossword-game`). Full specification — [PRD (issue #1)](https://github.com/vik8174/word-crossword-game/issues/1).

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

## How work happens here: TRIAL

This project runs on **TRIAL** (**T**emplate, **R**efute, **I**mplement, **A**ppeal, **L**and), the loop that tries to refute the claim that an issue's acceptance criteria are met. A session starts it with `/trial`.

The seats (Architect, issue inspector, Foreman, Worker, Inspector), their counts, the levels and the rules live in the global files, not in this repository: `~/.claude/skills/trial/SKILL.md` and `~/.claude/skills/trial/reference/loop.md`, with the agents `trial-foreman`, `trial-worker`, `trial-inspector` and `trial-issue-inspector` in `~/.claude/agents/`. Nothing under `.claude/` in this repository defines a seat, so there is one copy of each rule. **The project contract below** is the part that is this project's own, and every seat reads it.

**Determine your role by how you were started.** If you were handed a specific issue, a handoff document or an implementation task, you are a Worker. Every other seat is told what it is in the first line of its instruction.

The loop's earlier names (Refutation Loop, Adversarial Review Loop or ARL) and its earlier roles (Planner, Dispatcher, Challenger, and the coordinator before them) survive only as a record, in the git history, in old issues and in `docs/decisions/`; read them there as TRIAL's seats.

Handoff documents live in `handoffs/` (git-ignored). The project's durable memory is git history, GitHub issues and pull requests, and `docs/decisions/`.

## The project contract

Every seat of the loop reads this section, and every acceptance criterion cites
it. **The figures in the commands table and the five checks below were measured on `81361ea`, on 2026-10-14**, from a clean worktree, by running the command beside each. The budgets section carries its own commit. Nothing here is copied from a README. If you find a figure
that no longer holds, that is a finding about this section, and correcting it is
the Architect's hand.

### Toolchain

`pnpm@10.33.0` (the `packageManager` field pins it), Node 22 (what CI uses), a
pnpm workspace over `apps/*` and `packages/*`.

### Commands, and how long each takes

| what       | command                                            | measured                               |
| ---------- | -------------------------------------------------- | -------------------------------------- |
| install    | `pnpm install --frozen-lockfile`                   | 4 s with a warm store, minutes without |
| dev server | `pnpm dev` (Vite, `--port` to move it)             | —                                      |
| workshop   | `pnpm --filter web storybook`                      | port 6006 unless moved                 |
| lint       | `pnpm lint` (`eslint .` then `prettier --check .`) | 6 s                                    |
| tests      | `pnpm test`                                        | 16 s, 967 tests in 87 files            |
| coverage   | `pnpm test:coverage`                               | 22 s, 99.56 % of statements (web)      |
| build      | `pnpm build`                                       | 14 s                                   |
| rules      | `pnpm test:rules`                                  | 7 s                                    |
| e2e        | `pnpm test:e2e`                                    | about 43 s locally, 1m42s in CI (#303) |

The test count is the sum of two packages: 877 tests in 78 files in `apps/web` and 90 in 9 in `packages/shared`. Coverage is that of `apps/web` (1597 of 1604 statements); `packages/shared` is at 100 %.

`pnpm build` is four things in a row: `tsc --noEmit`, `vite build`,
`assert-no-source-maps.mjs`, and a Storybook build. A type error fails the build
rather than a separate typecheck step, so there is no `pnpm typecheck`.

`pnpm test:rules` starts a Firestore emulator, which needs a JDK. It passes on
Java 17 today and **warns that firebase-tools 15 will require Java 21**; when
that lands, this is the check that breaks first.

### The checks that must be green before a merge

Six, and these are the names CI gives them: **Lint, Test, Coverage, Build,
Rules, E2E**. The first five passed on `81361ea` from a clean worktree; E2E
was added by #303 (`979b399`) and passed there. E2E is deliberately not a
required check in the branch protection (Viktor, 2026-10-16), but a red E2E is
still a red pull request: do not merge it.

The merge is gated by a hook rather than by anyone's eye: `gh pr merge` here is
refused for a pull request that is red, still running, draft, conflicting, or
**behind its base branch**. A refusal is information, not an obstacle:
`gh pr update-branch <n>`, wait for the checks, merge. There is never another
route to the same merge.

### Ports

They must not collide, because a crew and its Inspector run at the same time.

| seat               | dev server                   | workshop | served template |
| ------------------ | ---------------------------- | -------- | --------------- |
| Worker             | 5174                         | 6006     | 8174            |
| Inspector          | 5175 (and 5176 for a second) | 6007     | 8175            |
| an issue inspector | 5178                         | —        | 8176            |

An E2E run (`pnpm test:e2e`, #292) takes six ports from the environment
(`E2E_FIRESTORE_PORT`, `E2E_AUTH_PORT`, `E2E_HUB_PORT`, `E2E_LOGGING_PORT`,
`E2E_FIRESTORE_WS_PORT`, `E2E_PREVIEW_PORT`), so two runs can share a machine:

| who                 | Firestore / Auth / hub / logging / websocket / preview |
| ------------------- | ------------------------------------------------------ |
| CI and the defaults | 8080 / 9099 / 4400 / 4500 / 9150 / 4173                |
| Worker              | 8180 / 9190 / 4410 / 4510 / 9160 / 5184                |
| Inspector           | 8181 / 9191 / 4411 / 4511 / 9161 / 5185                |

Vite's own default is 5173; leave it free for whoever is working by hand.

**The ports separate the servers. They do not separate the instrument.** There
is one Browser pane with one tab, and every seat drives it. A tab can navigate
itself out from under a measurement between a `navigate` and an `evaluate`, and
neither seat can tell that it happened: this has already cost one sweep, when an
Inspector's template on `:8175` became the Worker's workshop on `:6006`
mid-script. So:

**A seat that measures anything drives its own instrument, calibrates it, and
anchors what it measured.** In three parts, each of which has earned its place:

1. **Its own browser**, not the shared pane. A private headless Chromium over
   CDP works, with `Emulation.setDeviceMetricsOverride` set **before**
   `Page.navigate` so the narrow-viewport trap cannot bite.
2. **Calibrated before it is trusted**, against a reading known to be good — the
   pane at 1440 will do — and agreeing to the decimal before any figure taken
   through it is quoted.
3. **The artefact anchored by hash, and it is the served bytes that count.**
   A template is a file another branch can change under a running cycle. Hash
   **four** things, not one, and re-check before measuring, after measuring,
   and either side of a `gh pr update-branch`:

   | what                                    | why                                           | a change means                                                                        |
   | --------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------- |
   | the file in the baseline worktree       | the drawing you meant                         | **fault**: stop                                                                       |
   | **the bytes actually served**           | what the measurement was really taken against | **fault**: stop                                                                       |
   | **the base's own copy** (`origin/main`) | what a branch update will bring in            | it is the reference the row below is read against                                     |
   | the branch worktree's copy              | it moves when the base moves                  | **depends on the row above**: expected if the base moved too, **fault** if it did not |

   Hashing the file on disk alone is not the guarantee. A server can serve
   something other than the file you believe it is serving — a wrong root, a
   cache, a stale process holding the old bytes — and **a measurement is taken
   against what was served**.

   The last two rows go together, and the third is the one that does the
   reasoning. **"Expected" is never a property of the update; it is a property
   of what landed in the base.** A branch copy that differs while the base is
   unchanged means something moved the file that no commit accounts for — a
   fault. The same difference after the base has moved is ordinary and costs
   nothing, because the drawing is never served from the branch tree. **A check
   that cannot see the base cannot tell those apart**, however carefully it is
   read, and it fails silently in one direction: a seat stops for no reason at
   its busiest moment, or it labels a real fault as expected.

   Both corrections are the same lesson: **hash the thing the conclusion
   actually depends on**, not the thing nearest to hand.

   Make it a script that exits non-zero, not a thing to remember. **The verdict
   carries the check's output, not a claim about it.** That turns "the
   instrument moved under me" from something a seat has to notice into something
   that fails loudly.

A verdict states that baseline and branch came from **the same browser, the same
device-scale factor and the same script**, and names the revision of any drawing
it measured. Without that line, a rect difference between two revisions of a
drawing is indistinguishable from a defect in the build.

### What a worktree needs that git does not carry

**`apps/web/.env`, which lives in `apps/web/` and not at the repository root.**
Carry it with:

```bash
scripts/copy-env-to-worktree.sh <path-to-worktree>
```

A dev server without it answers 200 with an empty page and `Missing Firebase env
vars` in the console, which looks exactly like a broken app. That trap has cost
this project two review rounds. The script exists rather than a hand-written `cp`
because a permission rule matches a command by its prefix: one name is one rule.

### Budgets an issue may cite

| ceiling                               | where it is enforced                                         | measured on `f18aae2`      |
| ------------------------------------- | ------------------------------------------------------------ | -------------------------- |
| first visit, **218.0 KiB gzipped**    | `apps/web/build/first-visit-weight.ts`, run by `vite build`  | **198.2 KiB**, plain build |
| latin-ext faces, **60.0 KiB gzipped** | the same check, summed over the three latin-ext faces (#232) | **46.2 KiB**               |

Measured on the tree of `f18aae2` (#270 merged; the figures are #270's Inspector's, on
`33c769d`, which `f18aae2` squashes), with no `apps/web/.env` and `SENTRY_UPLOAD` unset.
The italic's 17.3 KiB is printed on its own line and counted against no ceiling
(`NOT_ON_FIRST_VISIT`, ADR 0032 addendum). `.env` present adds its embedded config:
**198.3** against 197.8 on #232's `4350fe0`.

**Every build is safe to measure with since #270.** A build uploads source maps only
with `SENTRY_UPLOAD=1` and a token (ADR 0018 addendum); a token alone, such as
`.env`'s, gives a plain build. Only `deploy.yml` sets the switch. **No seat ever sets
`SENTRY_UPLOAD=1` with a real token.** To prove the upload path, use a dummy token
and a Sentry address nothing listens on, in a tree without `.env`:
`SENTRY_AUTH_TOKEN=dummy-not-a-token SENTRY_URL=http://127.0.0.1:9 SENTRY_UPLOAD=1`.
Before #270 an unset variable uploaded, twice (#224, #234).

**CI weighs a lighter bundle than the one that reaches a player**: a deploy build
runs the Sentry plugin, which a plain build does not, and that adds roughly 1.6 KiB
(measured with the dummy method on `c6eb564`: 197.8 plain, 199.4 with the plugin).
So a production first visit is about **199.8**. The difference is in the artefact,
not in the moment of measuring, so a pull request sitting 1 KiB under the ceiling
in CI is not under it in production. Say which build produced any figure quoted in
an issue, and quote the command and the commit with it, never the row alone.

**This row goes stale faster than anything else here.** It said 190.7 on
`bc02ded` for two releases' worth of issues, and a stale figure has been quoted
into issues before an inspector caught it by building the branch rather than by
reading it. A weight is a measurement of one commit by one command: if the
commit you are on is not the commit in the heading, **run the command** rather
than cite the row.

### Default level

The loop's own table (`~/.claude/skills/trial/reference/loop.md`, **Priority, complexity and effort**). This project does not replace it.

| The issue is                           | Its level is |
| -------------------------------------- | ------------ |
| `P0`, or `L` and on the risk floor     | high         |
| `P3`, or `S` and not on the risk floor | low          |
| anything else                          | medium       |

### Priority, complexity and effort

The loop's own table, unchanged. Complexity sets the model effort of the seats:

| Complexity | Worker, Inspector, issue inspector | Foreman |
| ---------- | ---------------------------------- | ------- |
| `S`        | medium                             | medium  |
| `M`        | high                               | medium  |
| `L`        | xhigh                              | medium  |

### Risk floor additions

On top of the loop's own floor, work that touches any of these is never below high:

- `firestore.rules`
- `apps/web/vite.config.ts`
- `apps/web/build/`
- anything under `.github/workflows/`

### Paths that force the Inspector's own build

At medium, an Inspector may reuse the Worker's built binary unless the diff touches one of these:

- `package.json`
- `pnpm-lock.yaml`
- `apps/web/vite.config.ts`
- `apps/web/build/`
- `apps/web/index.html`

### Templates

`design/templates/`, one file per drawing; the state tree is
`design/templates/state-tree.html`. A visual issue is drawn before it is built,
approved by Viktor, and merged to `main` on a `design/<name>` branch before the
issue that builds it starts (ADR 0035). The Worker builds to it and the Inspector
serves it beside the branch.

### Recording a round

```bash
scripts/record-round.sh <issue> <round> report|verdict     # handoffs/verdicts/<issue>/round-<n>-<kind>.md
scripts/record-round.sh <issue> <cycle> issue-verdict   # handoffs/issue-reviews/<issue>/cycle-<n>-verdict.md
```

**One script takes all three kinds, and it never replaces a record.** A second
write to an existing record fails, names the file, and writes nothing. An issue
inspector records with `issue-verdict`; it needs no hand-written file.
`handoffs/` is git-ignored, which is the point: a verdict that lives only in a
sub-agent's context dies with it.

### What a person must look at before a release

**#240**, the release issue for 1.3.0 (_Across the Street_). #139, the 1.3.0 issue of the rejected garden design, is closed as not planned (Viktor, 2026-10-14), and the lines it collected carry over to #240. It carries the Screens table, and each merged issue
adds its own "what to look at by eye" list to it **where it has one**. The
Architect keeps that table;
its input is what lands on the release issue when an issue merges, not the merge
line on the issue itself.

### Measuring traps this project has already paid for

- **Narrow viewports need device emulation.** A plain window resize clips at
  500 px here, so 375 is unreachable that way.
- **Browser screenshots must land inside a workspace root.** Put them under
  `handoffs/`.
- **A contrast measurement hides the ink with `visibility: hidden`**, never
  `color: transparent`, which leaves the text shadow in the plate. And the best
  of several samples is not the median: say which you took.
- **An app-side figure in an issue is often derived from source rather than
  measured in a running app.** An issue must say which, of every number. A live
  measurement that disagrees with a derived one is a finding about the issue, to
  be raised rather than built around.

## Development process

Branches, code review, CI, ADRs, changelog — see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Testing

Unit tests are mandatory for the pure modules in `packages/shared` (`crossword-generator`, `crossword-numbering`, `word-assignment`, `word-list-validator`, `guess-checker`). A test verifies external behavior (input → output), not implementation details.
