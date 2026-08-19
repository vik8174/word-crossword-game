# Word Crossword Game

A cooperative web game for two players: a crossword where each player explains the words hidden from the other (as in Alias/Taboo), while the other guesses and fills the answers into a shared grid. The MVP targets vocabulary growth and spoken English practice.

## Quick Start

```bash
git clone https://github.com/vik8174/word-crossword-game.git
cd word-crossword-game
pnpm install
cp apps/web/.env.example apps/web/.env  # fill in Firebase/Sentry values, see Configuration below
pnpm dev
```

`pnpm dev` starts `apps/web` (Vite dev server) at http://localhost:5173.

## Tech Stack

- React (Vite + React Router), MUI
- Firebase: Firestore, Anonymous Auth, Analytics, Hosting
- Sentry
- pnpm workspaces (monorepo, no Turborepo/Nx)

## Prerequisites

- Node.js >= 22
- pnpm 10.x (`corepack enable` picks up the version pinned in `package.json`)
- A JDK 21 or newer, only for `pnpm test:rules` — the Firestore emulator runs on the JVM

## Configuration

`apps/web` reads its Firebase/Sentry config from environment variables at build time. Copy the template and fill in real values:

```bash
cp apps/web/.env.example apps/web/.env
```

- `VITE_FIREBASE_*` — from Firebase Console > Project settings > General > Your apps > SDK setup
- `VITE_SENTRY_DSN` — from Sentry > Project Settings > Client Keys (DSN). Left empty, error reporting does not start at all, which is what a local checkout wants
- `VITE_SENTRY_ENVIRONMENT` — which deployment this build is, `stage` or `production`. Not derived from the build mode: both are built as `production`, so nothing else tells them apart. Only a build run by hand reads it from `.env` — a deploy sets it from the ref it was triggered by, so that it cannot be left out and file a deployment's errors under `unknown` ([Deployment](#deployment))
- `SENTRY_AUTH_TOKEN` — an organization token, from Sentry > Settings > Developer Settings > Organization Tokens > **Create New Token**. Its scope is fixed at `org:ci` — source map upload, release creation, code mappings — and it is shown once, at creation. It also carries the organization's region in it, which a personal token does not; on this EU-region organization a personal token would additionally need the plugin's `url` set. Note the missing `VITE_` prefix: Vite embeds every `VITE_` variable into the bundle in plain text, and this bundle is public, so the prefix would publish the token. Only the build reads it, and only on the Node side. Left empty the build still succeeds — see [Source maps](#source-maps)

`apps/web/.env` is git-ignored — never commit real values.

## Telemetry

Firebase Analytics reports three moments — a room created, a player joined, a game finished — plus a page view per screen. Sentry reports JavaScript errors and unhandled promise rejections.

Neither is allowed to name a room. The id in `/room/<id>` is the whole access control around a game — anyone holding it reads the room document, words included — so Firebase's automatic page view is switched off (it carries the address bar verbatim), analytics events are typed to carry numbers and nothing else, and every Sentry event is redacted on its way out. Browser tracing and session replay are deliberately not switched on. See [ADR 0014](docs/decisions/0014-telemetry-without-room-ids.md).

### Source maps

A production build minifies the whole app into one bundle, so a stack trace out of it names a column in that bundle rather than a line of source. Sentry translates it back only when it holds the source maps for the build the error came from, which is what `@sentry/vite-plugin` uploads.

The plugin runs only when `SENTRY_AUTH_TOKEN` is set and the build could name itself:

- **With a token** the build generates maps, uploads them, and deletes them from `apps/web/dist` again. They are for Sentry, not for players — Firebase Hosting publishes `dist` whole, so a map left behind would serve everyone the unminified source. `apps/web/scripts/assert-no-source-maps.mjs` runs at the end of every build and fails it if any `.map` survived.
- **Without a token** — a fresh clone, or CI on a pull request — no maps are generated in the first place and nothing is uploaded. The build succeeds, in the same way the app runs without a DSN.

Both halves agree on one release name, and that name is the product's version joined to the commit the build came from — `1.0.0+700f8a8b3c9d`. `vite.config.ts` resolves it once, files the uploaded maps under it, and puts the same value into `import.meta.env.VITE_SENTRY_RELEASE`, which is where `initializeErrorReporting` reads it. Two names, and Sentry ends up holding maps and events with no way to match them — the trace stays minified and nothing says why.

The version comes from the `version` field of the **root `package.json`**, which is the one place it lives: the git tag and `CHANGELOG.md` describe the same repository, so all three sit together. `apps/web` and `packages/shared` keep a placeholder `0.0.0` — they are private, never published, and nothing reads their version. Outside a git checkout — a source archive — the release is the version alone, which is still a name both halves agree on, so such a build uploads maps like any other. See [ADR 0019](docs/decisions/0019-a-release-is-a-version-and-a-commit.md).

Every deploy builds with the token, so the maps of whatever is live are always in Sentry; a deploy whose environment holds no token fails before it builds rather than publishing a bundle nothing can read. Stage and production share one Sentry project and are told apart by the environment tag, so they also share the release name whenever a tag sits on a commit stage already has — the same build, in two places. See [ADR 0018](docs/decisions/0018-source-maps-for-sentry-only.md) and [ADR 0020](docs/decisions/0020-two-environments-and-a-deploy-that-runs-itself.md).

## Firestore

There is no backend in this project — browsers write to Firestore directly — so `firestore.rules` is the only access control there is.

```bash
pnpm test:rules                                                       # check the rules against the emulator
pnpm exec firebase deploy --only firestore:rules --project stage      # deploy them by hand, should it ever be needed
```

`firebase-tools` is a dev dependency of the repo, so both commands work after `pnpm install` — no global install needed. Deploying by hand is the exception: every deploy publishes the rules together with the app, so the rules on a project are the ones on the commit it was deployed from (see [Deployment](#deployment)).

Deleting stale rooms relies on a Firestore **TTL policy** on the `expiresAt` field of the `rooms` collection. The app writes that field and pushes it another 24 hours out on every write to the room, so a room is collected only after a full day in which nobody touched it ([ADR 0013](docs/decisions/0013-keeping-a-room-alive-on-every-write.md)). The policy itself is enabled once by hand in the Google Cloud console (Firestore > TTL policies), on `rooms` / `expiresAt` with a zero offset. It is not part of this repository and not part of any deploy: **each project needs its own, and a project without one deletes no room, ever.**

Worth knowing before setting one up elsewhere: **a TTL policy needs billing enabled on the project.** On the no-cost Spark plan the console refuses to create one — `403: Project ... has billing disabled` — so both projects run on pay-as-you-go (Blaze). The free usage quotas are the same on both plans and this game does not come close to them; the plan is what unlocks the feature, not what the traffic costs.

The policy deletes lazily: Firestore's guarantee is deletion within about 24 hours of the expiry, not at the second it passes. A room that has expired but is still in the database is therefore normal, and the app handles it — the room screen explains the expiry to whoever opens the link, and the security rules refuse every write to such a room rather than letting a game resume in one that may vanish at any moment.

## Deployment

Two environments, and two Firebase projects that share nothing — not a database, not a set of keys:

| Environment  | Firebase project            | Address                                     | Deployed by           |
| ------------ | --------------------------- | ------------------------------------------- | --------------------- |
| `stage`      | `word-crossword-game-stage` | <https://word-crossword-game-stage.web.app> | every merge to `main` |
| `production` | `word-crossword-game-prod`  | <https://word-crossword-game-prod.web.app>  | a `v*` release tag    |

`.github/workflows/deploy.yml` does both, and nothing else deploys anywhere. Stage moves on its own so that what is live is what `main` says; production moves only when somebody tags a release, so shipping stays a deliberate act. Each deploy publishes the app **and** `firestore.rules` in one command: the rules are the whole of the access control here, so a database running the app without them would be a database with the wrong rules on it.

One name decides everything about a deploy — `stage` or `production`, worked out from the ref that triggered it. It is the GitHub environment whose secrets the build is given, the `.firebaserc` alias the deploy names, and the value of `VITE_SENTRY_ENVIRONMENT` the errors are tagged with. There is one of it, so the three cannot drift apart. See [ADR 0020](docs/decisions/0020-two-environments-and-a-deploy-that-runs-itself.md).

An invite link points straight at `/room/<id>`, a route that exists only in the browser, so `firebase.json` rewrites every path to `index.html`. Without that rewrite an invite opened in a fresh tab is a 404 rather than a room. Both addresses are the standard `*.web.app` one; nothing in the app hard-codes an origin, so a custom domain attaches later without a rebuild.

### Deploying by hand

`.firebaserc` names both projects and deliberately has **no `default` alias**, so there is no such thing as a command that deploys wherever the CLI last happened to point:

```bash
pnpm build
pnpm exec firebase deploy --only hosting,firestore:rules --project stage
```

Leave `--project` out and the CLI refuses to do anything, which is the point. Note that `firebase use <alias>` records an active project outside this repository and would bring the default back for you alone — pass the flag rather than relying on it.

### Standing up an environment

Everything below is done once per Firebase project, by hand, in a console. None of it is in this repository:

1. **Create the Firebase project**, and in it enable **Anonymous Auth** (Authentication > Sign-in method), **Firestore** and **Google Analytics**. Register a Web app to get the SDK config.
2. **Put the project on the Blaze plan.** Not for the traffic — for the TTL policy, which the console refuses to create on Spark (see [Firestore](#firestore)).
3. **Create the TTL policy** in the Google Cloud console (Firestore > TTL policies): collection `rooms`, field `expiresAt`, zero offset. Without it no room is ever deleted, and nothing in a deploy will tell you so.
4. **Create a service account** for the deploy (Google Cloud console > IAM & Admin > Service Accounts) and give it, on that project alone, all four of:

   | Role                   | Id                                        | What it is for                                                                                       |
   | ---------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
   | Firebase Hosting Admin | `roles/firebasehosting.admin`             | publishing the app                                                                                   |
   | Firebase Rules Admin   | `roles/firebaserules.admin`               | publishing `firestore.rules`                                                                         |
   | API Keys Viewer        | `roles/serviceusage.apiKeysViewer`        | reading the web app config, which the CLI does before it deploys hosting                             |
   | Service Usage Consumer | `roles/serviceusage.serviceUsageConsumer` | `serviceusage.services.get` — the CLI asks whether the Firestore API is on before it publishes rules |

   The last one is easy to leave out and the failure names neither it nor the role that would fix it: `403 Permission denied to get service [firestore.googleapis.com]`, from the deploy step, after everything else has already succeeded. API Keys Viewer grants access to API _keys_, not to _services_, so it does not cover this.

   Owner is not needed and should not be granted. Download a JSON key, and give the secret the **whole file** — see step 5.

5. **Create the GitHub environment** of the same name as the `.firebaserc` alias (Settings > Environments), and give it every variable the build reads — the names are the ones in `apps/web/.env.example`, plus `FIREBASE_SERVICE_ACCOUNT` holding the JSON key. `VITE_SENTRY_ENVIRONMENT` is the exception: the workflow sets it from the ref, so it is never stored.

The deploy checks that every name in `apps/web/.env.example` arrived with a value before it builds, and stops if one did not. A missing key therefore costs a failed deploy rather than a white screen for whoever opened the link first — which is what `firebase/config.ts` would otherwise give them, in the browser. A variable added to `.env.example` becomes required by the same step, without it being edited.

Sentry needs nothing set up per environment: both deployments report into the same project and are separated by the environment tag, which Sentry creates the first time an event arrives carrying it.

## Scripts

Run from the repo root (fans out to both workspaces via pnpm):

| Command              | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| `pnpm dev`           | Start the `apps/web` dev server                              |
| `pnpm build`         | Build all workspaces                                         |
| `pnpm lint`          | ESLint + Prettier check across the repo                      |
| `pnpm test`          | Run unit tests (Vitest) for both workspaces                  |
| `pnpm test:coverage` | Run tests with coverage (80% threshold, hard-fails below it) |
| `pnpm test:rules`    | Check `firestore.rules` against the Firestore emulator       |

## Project Structure

```
word-crossword-game/
├── apps/web/            # React SPA
├── packages/shared/     # Shared types + pure game logic
├── firestore.rules      # Firestore security rules (the only access control)
├── firestore/           # Emulator checks for those rules
├── docs/decisions/      # ADRs — architecture decisions
├── CONTRIBUTING.md      # Development process
└── CLAUDE.md            # Context for AI agents working in this repo
```

## Documentation

- Product specification: [PRD (issue #1)](https://github.com/vik8174/word-crossword-game/issues/1)
- Architecture decisions: [`docs/decisions/`](docs/decisions/)
- Development process, tests, linting, CI: [`CONTRIBUTING.md`](CONTRIBUTING.md)
