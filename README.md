# Word Crossword Game

A cooperative web game for 2-4 players: a crossword where each player explains the words hidden from the others (as in Alias/Taboo), while the rest guess and fill the answers into a shared grid. The MVP targets vocabulary growth and spoken English practice.

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
- `VITE_SENTRY_ENVIRONMENT` — which deployment this build is (`stage` today). Not derived from the build mode: stage and production are both built as `production`, so nothing else tells them apart
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

Both halves agree on one release name: `vite.config.ts` resolves it once from `git rev-parse HEAD`, files the uploaded maps under it, and puts the same value into `import.meta.env.VITE_SENTRY_RELEASE`, which is where `initializeErrorReporting` reads it. Two names, and Sentry ends up holding maps and events with no way to match them — the trace stays minified and nothing says why. A build with no revision to read — a source archive rather than a checkout — therefore uploads nothing even when it has a token, rather than letting the plugin invent a name of its own.

There is no deploy job in CI yet, so maps reach Sentry from whichever build is run by hand. The token therefore has to exist on the machine that builds, not only in GitHub Actions secrets.

## Firestore

There is no backend in this project — browsers write to Firestore directly — so `firestore.rules` is the only access control there is.

```bash
pnpm test:rules                                     # check the rules against the emulator
pnpm exec firebase deploy --only firestore:rules    # deploy them (project alias lives in .firebaserc)
```

`firebase-tools` is a dev dependency of the repo, so both commands work after `pnpm install` — no global install needed.

Deleting stale rooms relies on a Firestore **TTL policy** on the `expiresAt` field of the `rooms` collection. The app writes that field and pushes it another 24 hours out on every write to the room, so a room is collected only after a full day in which nobody touched it ([ADR 0013](docs/decisions/0013-keeping-a-room-alive-on-every-write.md)). The policy itself is enabled once by hand in the Google Cloud console (Firestore > TTL policies) and is not part of this repository. On the stage project it is live, on `rooms` / `expiresAt` with a zero offset.

Worth knowing before setting one up elsewhere: **a TTL policy needs billing enabled on the project.** On the no-cost Spark plan the console refuses to create one — `403: Project ... has billing disabled` — so the stage project runs on pay-as-you-go (Blaze). The free usage quotas are the same on both plans and this game does not come close to them; the plan is what unlocks the feature, not what the traffic costs.

The policy deletes lazily: Firestore's guarantee is deletion within about 24 hours of the expiry, not at the second it passes. A room that has expired but is still in the database is therefore normal, and the app handles it — the room screen explains the expiry to whoever opens the link, and the security rules refuse every write to such a room rather than letting a game resume in one that may vanish at any moment.

## Hosting

The built app is served from Firebase Hosting, from the same project the database lives in:

```bash
pnpm build                                    # apps/web/dist is what gets uploaded
pnpm exec firebase deploy --only hosting
```

An invite link points straight at `/room/<id>`, a route that exists only in the browser, so `firebase.json` rewrites every path to `index.html`. Without that rewrite an invite opened in a fresh tab is a 404 rather than a room.

Stage is <https://word-crossword-game-stage.web.app>. There is no production project yet — see [ADR 0007](docs/decisions/0007-stage-only-environment.md).

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
