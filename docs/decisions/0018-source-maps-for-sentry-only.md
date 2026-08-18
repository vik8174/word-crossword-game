# 0018. Source maps for Sentry only, under one release name

Status: Accepted

## Context

A production build minifies the whole app into a single bundle, so every stack trace Sentry received named a column in that bundle. Nobody can read one. Sentry translates such a frame back into a file and a line when it holds the source maps for the build the error came from, which is what [issue #52](https://github.com/vik8174/word-crossword-game/issues/52) asked for.

Uploading maps is the easy half. Three things around it fail quietly, and each looks the same from the outside — a trace that is still minified, with nothing saying why.

**A map that reaches the browser undoes the minification for everybody.** `firebase.json` publishes the whole of `apps/web/dist`, and its `ignore` list — `firebase.json`, `**/.*`, `**/node_modules/**` — does not cover `.map`. `@sentry/vite-plugin` can delete the maps once it has uploaded them, but that only happens on a build where the plugin actually runs. A build that generates maps and cannot upload them leaves them in `dist`, and the next deploy serves the unminified source to every player.

**A map Sentry cannot match to an event is a map that changes nothing.** Until this ticket `init()` was called with no `release` at all, so events arrived nameless. The plugin, given no name of its own, goes looking for a revision in the environment — CI variables this project never reads. It would then file the maps under a name the bundle has never heard of. Both halves arrive at Sentry and never meet.

**A `VITE_`-prefixed token is a published token.** Vite embeds every variable with that prefix into the client bundle in plain text, and this bundle is served from public hosting out of a public repository.

## Decision

**One name, resolved once, given to both sides.** `vite.config.ts` calls `resolveReleaseName(readGitRevision)` — the commit the build was made from — and hands that single value to the plugin's `release.name` and to `define`, as `import.meta.env.VITE_SENTRY_RELEASE`. `main.tsx` already passes `import.meta.env` to `initializeErrorReporting`, which reads the key and gives it to `init()`. Nothing works the name out twice, so the two sides cannot come to disagree.

**Generating maps and uploading them are one decision, not two.** `shouldUploadSourceMaps(authToken, release)` is true only when the build has both a token to upload with and a name to file the upload under; `build.sourcemap` and the plugin are switched on and off together by it. A build that cannot upload writes no maps at all, so there is nothing left in `dist` for a deploy to serve, and a build that cannot name itself uploads nothing rather than letting the plugin invent a name.

**Nothing points a browser at a map.** `build.sourcemap` is `'hidden'`, so the bundle carries no `sourceMappingURL` comment. Sentry matches by the debug id the plugin injects into the bundle and the map alike, which needs no such comment.

**Two things keep `dist` clean, and one of them is checked.** The plugin deletes the maps after uploading (`sourcemaps.filesToDeleteAfterUpload`), and `apps/web/scripts/assert-no-source-maps.mjs` runs at the end of every `pnpm build` and fails it if any `.map` survived — on every build, including the ones that never generated maps, and including CI.

**The token is `SENTRY_AUTH_TOKEN`, and it never gets a `VITE_` prefix.** `vite.config.ts` reads it with `loadEnv(mode, …, 'SENTRY_')`, on the Node side, and passes it to the plugin. It reaches no application code.

## Consequences

- A stack trace from the deployed app names a source file and a line. Verified on stage rather than reasoned about: an error thrown from application source arrived with frames reading `src/telemetry/…:9:13`, tagged with the release the maps were uploaded under
- `pnpm build` still works in a checkout with no `.env`, as the app still runs with no DSN ([ADR 0014](0014-telemetry-without-room-ids.md)). CI's `Build` job has no secrets and needs none
- Frames name a file and a line, not a function: the minified function name is what the bundle carries, and this project does not upload a name map to change that
- Maps are uploaded by whichever build is run by hand, because there is no deploy job in CI yet ([issue #53](https://github.com/vik8174/word-crossword-game/issues/53)). The token therefore has to exist on the machine that builds, not only in GitHub Actions secrets. When that job arrives it inherits all of this unchanged, needing only the secret
- A build outside a git checkout — a source archive — silently uploads nothing even when it has a token. That is the trade for never uploading under a name the bundle does not know, and it is stated in the README rather than left to be discovered
- Rebuilding the same commit twice uploads a second set of maps under one release name. The debug id the plugin injects differs per build and is what Sentry matches on, so the older maps are never applied to the newer bundle
- Nothing here touches the single exit every event leaves the browser through. `beforeSend: (event) => redactRoomIdsDeep(event)` is unchanged, and the release name is an option on `init()` rather than a new integration, hook, or transport — the guarantee [ADR 0014](0014-telemetry-without-room-ids.md) rests on is intact. The debug id and the file paths a mapped frame carries name the bundle and the repository, never a room
