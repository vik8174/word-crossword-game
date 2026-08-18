# 0020. Two environments, and a deploy that runs itself

Status: Accepted

Amends [0007](0007-stage-only-environment.md), which created every external service as stage and left production as a decision to be taken "once a real need appears". This is that decision.

## Context

[0007](0007-stage-only-environment.md) was right for a project with no users. Everything lived in one Firebase project marked `-stage`, one Sentry project, one set of nine build variables with no `_STAGE`/`_PROD` suffix to tell them apart, because there was nothing to tell them apart from.

Two things forced the question.

**A game shared with somebody is no longer a test rig.** Sharing an invite link to a project where rules and data shapes are broken on purpose means an experiment can take somebody's game down with it — and it means the errors of people playing arrive mixed with the errors of whoever was breaking something that afternoon.

**Nothing deployed anything.** `.github/workflows/ci.yml` ran five checks and stopped there; a deploy was `pnpm build && pnpm exec firebase deploy` from a laptop, whenever somebody remembered. At the time this was written, what was live on stage was three merged pull requests behind `main`. Production would have doubled the number of places that can silently fall behind, so the automation had to arrive with it rather than after it.

Two smaller things were already loaded and would have gone off on the first production deploy:

- `.firebaserc` had a single `default` alias pointing at stage. Whichever project that alias named, a command that forgot `--project` would deploy somewhere without saying so — to stage while meaning production, or, if the default were moved, to production from every habit and every line of the README.
- A new Firebase project starts with **its own** security rules, not the ones in this repository. There is no backend here ([0002](0002-no-dedicated-backend.md)), so `firestore.rules` is the entire access control; a production project given the app but not the rules would be either wide open or unplayable.

## Decision

### Two Firebase projects, one Sentry project

`word-crossword-game-prod` alongside `word-crossword-game-stage`: two databases, two key sets, two hosting sites. Promoting stage to production instead would have left nowhere to break a rules change, and would have mixed a year of test traffic into the analytics of the real thing.

Both ids name their environment, rather than [0007](0007-stage-only-environment.md)'s pattern of marking only the exception. A project id is permanent and is read from console lists and command lines where the two sit side by side, and a bare name there would be the one that has to be remembered rather than read. The price is that it is also the address — `word-crossword-game-prod.web.app` is what an invite link says until a custom domain covers it.

Sentry is **not** split the same way. One project, and the two deployments separated by the environment tag `VITE_SENTRY_ENVIRONMENT` already carries — the tag exists precisely because both are built in Vite's `production` mode and nothing else tells them apart ([0014](0014-telemetry-without-room-ids.md)). A second Sentry project would double the source map uploads and split one release's history across two places to look; the environment is what alerts and filters are written against anyway, and Sentry creates one the first time an event arrives carrying it.

### `main` deploys stage, a `v*` tag deploys production

`.github/workflows/deploy.yml` holds both, and nothing else deploys anywhere. Stage follows `main` with nobody asking, which is the drift this fixes. Production moves only when a tag says so, so shipping stays something a person decides.

A deploy publishes hosting **and** `firestore.rules` in one `firebase deploy --only hosting,firestore:rules`. Not two steps and not a remembered command: the rules and the app are one deployment, and the rules that are live are the ones on the commit that was deployed.

### One name decides everything about a deploy

The ref is turned into a single word — `stage` or `production` — and that word is then used three times: as the GitHub environment whose secrets the job is given, as the `.firebaserc` alias passed to `--project`, and as `VITE_SENTRY_ENVIRONMENT`. Three facts that must agree, kept as one value that cannot disagree with itself. A ref that is neither `main` nor a `v*` tag fails the job rather than defaulting to either.

### Credentials are separated by GitHub environments, not by variable names

Two GitHub environments, `stage` and `production`, each holding the same nine names with its own values, plus the deploy credential. A job declares which environment it is in and is handed that environment's secrets and no others, so a build has no name by which to reach the other environment's keys. This is what replaces the `_STAGE`/`_PROD` suffixes [0007](0007-stage-only-environment.md) said would be needed: a suffix asks every build to pick the right one of two visible sets, and picking is what goes wrong.

`VITE_SENTRY_ENVIRONMENT` is deliberately not among them. It is not a secret, and it is the one variable whose absence is silent — the app starts, the errors arrive, and they file themselves under `unknown` mixed in with the other deployment. It is derived from the ref instead, where it cannot be left out of a settings page.

A variable that never arrives fails the deploy before it builds. The required names are read from `apps/web/.env.example`, so the list has one home rather than two that can disagree.

### `.firebaserc` has no `default`

Both projects are named aliases and neither is the default. `firebase deploy` without `--project` now refuses to run, in CI and on a laptop alike, which is a better outcome than any choice it could have made on its own.

### A deploy is never cancelled halfway

`ci.yml` cancels superseded runs, which is right for checks and wrong for an upload: two merges in quick succession would have the second kill the first mid-deploy, leaving files, rules and a hosting release from different commits. The deploy workflow therefore has its own concurrency group with `cancel-in-progress: false`, so runs queue. That is also why it is a second workflow file rather than more jobs in the first — concurrency is a property of the whole workflow.

`ci.yml` in turn stops running on `push` to `main`: the deploy workflow verifies the commit it is about to deploy, which for a tag is a commit no pull request ever had as its head, so running the same suite twice on every merge would buy nothing.

### The tag has to name the version the repository states

[0019](0019-a-release-is-a-version-and-a-commit.md) left the root `package.json` version and the git tag able to disagree, and named this issue as the owner of that pairing. A production deploy checks that the tag is `v` followed by the version in `package.json`, and deploys nothing when it is not. The check refuses rather than writes: a tag can be moved in a second, whereas a release step that quietly edited a committed file would make the tag and the commit it points at describe different versions.

### The deploy authenticates as a service account

`firebase login:ci` and `FIREBASE_TOKEN` are the deprecated path. Each project instead gets a service account holding Firebase Hosting Admin, Firebase Rules Admin and API Keys Viewer on that project alone — enough to publish hosting and rules, and nothing else. Its JSON key is the environment's `FIREBASE_SERVICE_ACCOUNT` secret, and the CLI reads it through `GOOGLE_APPLICATION_CREDENTIALS`.

## Consequences

- What is live on stage is what `main` says, without anybody remembering a command. What is live in production is what somebody tagged
- The security rules of a project can no longer be older than the app running against it, since one command publishes both
- Standing up an environment is still mostly console work — the Firebase project, the Blaze plan, the TTL policy, the service account, the secrets — and this repository cannot do any of it or check that it was done. `README.md` carries the list; the TTL policy is the one that fails invisibly, because a project without it deletes no room and says nothing
- **The TTL policy is per project.** Stage having one says nothing about production having one, and a room that outlives its 24 hours in production is the first evidence either way
- Two deployments share one Sentry project, and share a release name whenever a tag sits on a commit stage already deployed — the same build in two places, told apart by the environment and by nothing else. That is what the environment tag is for, but a release page showing both is not a mistake
- A deploy of a commit whose checks were red is possible only by pushing a tag onto one, and the tag deploy re-runs the checks first. Nothing checks that a tagged commit is one `main` ever had: a tag on a branch nobody reviewed deploys to production, verified but unreviewed. Deliberate for a repository with one person tagging, and the first thing to revisit if that stops being true
- The nine variables now exist twice, in two consoles, out of the repository's sight. The deploy fails when one is missing; it cannot tell that one is merely wrong, and a production build carrying stage's Firebase keys would look entirely healthy
- Every deploy builds with `SENTRY_AUTH_TOKEN`, so the maps of whatever is live are always in Sentry ([0018](0018-source-maps-for-sentry-only.md)) — and an environment without the token fails the deploy rather than publishing a bundle whose traces nobody can read
- A pull request's checks and a deploy's checks are now written in two workflow files and can drift apart. Neither can be extracted into a reusable workflow without renaming the checks branch protection requires, which would block every pull request until the setting was changed by hand
