# The first visit, October 2026: what it loads and how much smaller it can get

Issue #291. A measurement and five prototypes. Nothing in the app changed and nothing here is merged. The Architect writes one issue for each candidate over the threshold.

Base commit for every figure: `9045b74` (main). Large artefacts are local, in `handoffs/bundle/291/` (git-ignored): the treemap, 50 Lighthouse JSON files, the prototype patches and the scripts.

## Method, and how it differs from the issue

- Build: plain `vite build`, `SENTRY_UPLOAD` and `SENTRY_AUTH_TOKEN` unset, no `apps/web/.env`. **One deviation, on purpose:** a build with no Firebase variables at all produces an app that does not start (`config.ts` throws `Missing Firebase env vars` while the entry runs, so `/` is a white page). The weight check still prints a number for it (199.6 KiB, the figure in the issue), but nobody can load it. Every figure here is therefore from a build with six dummy `VITE_FIREBASE_*` variables (a `demo-wcg` project) given in the shell, still with no `.env`: **199.8 KiB** first visit, 46.2 KiB latin-ext. The 0.2 KiB is that embedded config. `build.sh` in the bundle folder is the exact command.
- Server: **not `vite preview`.** It serves no compression, so Lighthouse would count about 3 times the bytes a player gets from Firebase Hosting. A 20-line Node static server with gzip level 6 and `no-cache` (`gzserve.mjs`) served `dist` on 5174 instead. Firebase Hosting would also offer brotli; not modelled.
- Tool: Lighthouse **13.5.0** (`pnpm dlx lighthouse@13.5.0`), `source-map-explorer` **2.5.3** (`--no-border-checks`, needed because the rolldown maps declare an `Infinity` column; per-package figures are its gzip estimates and are for ranking, not for adding up). Nothing added to any `package.json`.
- Instrument: the seat's own Chrome (`/Applications/Google Chrome.app`, `--headless=new`), a fresh browser and an empty profile per run, `--throttling-method=devtools`, navigation mode, performance category only, mobile default and `--preset=desktop`, **five runs per page and profile**, median with the range in brackets. Base and prototypes ran in one sitting on one machine, one after another. Calibration: there is no throttle-free reading to compare a throttled FCP with, so the instrument was checked the other way: the 13 requests Lighthouse saw on `/` match the build's file list, its transfer bytes (204.1 KiB, of which 2.1 KiB is `favicon.ico`) agree with the weight check's 199.8 KiB plus the favicon and header overhead, and the spread across five runs is under 6 % on every set (the range is in each row). Not done: a cross-check against `vite preview`.
- `/room/<id>`: against the Firestore and Auth emulators on a `demo-` project (8080, 9099). #292 has not merged, so the emulator hook was added **uncommitted** in the worktree, on `scratch/291-emulator-hook` only (`emulator-hook.patch`: `connectAuthEmulator` and `connectFirestoreEmulator` behind `VITE_EMULATOR`). The room was made through the real create form. The measured visit is a fresh browser opening the invite link, so it signs in anonymously and reads the room.
- `FCP`/`LCP` are Lighthouse's, in ms. **"Before FCP"** means the response ended before the run's FCP.

## Part 1: what a cold `/` loads

Build `9045b74`, plain, dummy Firebase env, gzip server. Median-LCP run of five (`home-base-mobile-*`), mobile profile.

| request                                                        | gzipped KiB | arrives                 | needed by Home's first render?                                                                                                              |
| -------------------------------------------------------------- | ----------: | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` (HTML)                                                     |         2.1 | before FCP              | yes                                                                                                                                         |
| `fonts/alegreya-sans-v28-latin-400.woff2`                      |        16.9 | before                  | yes: the body text face, and the LCP element is a paragraph                                                                                 |
| `fonts/alegreya-sans-v28-latin-700.woff2`                      |        16.9 | before                  | the name of the game is set in it (see candidate 5)                                                                                         |
| `assets/index-*.js` (entry: app code, theme, Home, Street SVG) |        10.8 | before                  | yes                                                                                                                                         |
| `assets/rolldown-runtime-*.js`                                 |         0.6 | before                  | yes                                                                                                                                         |
| `assets/react-*.js`                                            |        70.8 | before                  | yes                                                                                                                                         |
| `assets/mui~index~CreateRoomPage~RoomPage-*.js`                |        28.1 | before                  | yes: ThemeProvider, CssBaseline, GlobalStyles, Box, Typography, Emotion                                                                     |
| `assets/mui~index~RoomPage-*.js`                               |         0.8 | before                  | no use of its own (shared helper)                                                                                                           |
| `assets/mui~index-*.js`                                        |         7.2 | before                  | partly: it holds `CircularProgress`, `Container` and `Stack` from the route fallback, which Home never draws (under 3 KiB, see candidate 6) |
| `assets/firebase-core-*.js`                                    |        14.7 | before                  | **no**: Firebase app and Analytics, used only by an effect that runs after the first commit                                                 |
| `assets/motion-css-*.js`                                       |         5.2 | before                  | yes (shared app code); it also holds `firebase/config.ts` and `analytics.ts`, which pull the next row in                                    |
| `assets/sentry-*.js`                                           |        28.0 | before                  | **no**: with no DSN `initializeErrorReporting` returns at once; with one it only needs to catch later errors                                |
| `favicon.ico`                                                  |         2.1 | after                   | no                                                                                                                                          |
| **13 requests**                                                |   **204.1** | FCP 2616 ms [2606-2752] |                                                                                                                                             |

All twelve scripts and fonts are modulepreloaded or statically imported, so FCP waits for the slowest of them (`sentry`, response end 2457 ms; FCP 2621 ms). Firebase Auth and Firestore are **not** loaded: `firebase-room-*.js` (143.6 KiB) is only in a room visit. Home's whole first-visit cost is therefore the React, MUI and app bytes it needs (about 159 KiB, fonts included) plus **42.7 KiB** (`firebase-core` 14.7 and `sentry` 28.0) that it does not.

### Packages in each JavaScript chunk (five largest, gzip estimate, KiB)

| chunk                               | five largest                                                                                         |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `react`                             | react-dom 55.6, react-router 13.7, react 3.7, scheduler 1.5                                          |
| `mui~index~CreateRoomPage~RoomPage` | @mui/system 11.6, @mui/material 11.2, stylis 2.2, @emotion/is-prop-valid 2.0, @mui/utils 2.0         |
| `sentry`                            | @sentry/core 31.5, @sentry/browser 7.9, @sentry/browser-utils 3.1, @sentry/react 0.2                 |
| `firebase-core`                     | @firebase/util 3.8, @firebase/analytics 3.7, @firebase/app 3.0, @firebase/installations 2.7, idb 1.3 |
| `mui~index`                         | @mui/system 6.3, @mui/material 3.4, @mui/private-theming 0.4                                         |
| `index` (entry)                     | app components 8.4 (Street SVG about 4.9 of it), pages 1.5, theme 0.7, routing 0.5, main 0.4         |
| `motion-css`                        | app components 2.8, telemetry 1.3, street 0.5, firebase config 0.5, motion 0.3                       |
| `mui~index~RoomPage`                | @mui/material 0.5, @mui/utils 0.2                                                                    |

The treemap is `treemap-9045b74-firstvisit.html` (made from a separate `--sourcemap` build of the same commit with the same environment; its output hashes equal the plain build's, and the maps and that `dist` were deleted afterwards).

### Load figures

Median [range] of five runs each, base `9045b74`.

| page                      | profile |                     FCP ms |            LCP ms | requests | bytes on the wire |
| ------------------------- | ------- | -------------------------: | ----------------: | -------: | ----------------: |
| `/`                       | mobile  |           2616 [2606-2752] |  4625 [4612-4768] |       13 |         204.1 KiB |
| `/`                       | desktop |                93 [85-102] |  2094 [2082-2116] |       13 |         204.1 KiB |
| `/room/<id>`, invite link | mobile  |           2736 [2720-2836] | 9773 [9690-10130] |       24 |       431-447 KiB |
| `/room/<id>`, invite link | desktop | 81 [74-118] (not credible) |  2466 [2435-2709] |       23 |           445 KiB |

Read the room rows with care. All ten runs carry Lighthouse's warning that the page "loaded too slowly to finish", because Firestore's long-poll channel never goes quiet; the mobile LCP is the join screen drawing after the room document arrives (the Listen response ends at about 7.6 s of a 9.8 s load). Desktop FCP of 81 ms is earlier than any script can have run and is not a usable number. An invite visit downloads everything Home does, then `RoomPage`, `room-service` and `mui~RoomPage` before FCP, and `firebase-room` (143.6 KiB, of which re2js is about 45 and Firestore about 66) **after** FCP. That second visit is the most common one and is not covered by the candidates below (see "Not measured").

## Part 2: candidates, ranked

Each is a local branch `scratch/291-<name>` on `9045b74` plus the emulator hook, never pushed (patches in the bundle folder). "KiB" is the weight check's own count, base 199.8. Mobile profile, five runs, `/`; Δ against the base row in the same sitting. **Wire bytes did not fall**: moved scripts are still fetched right after FCP and inside the load window (base 204.1 KiB, "both" 206.0 KiB). The saving is on the path to first paint, not in bytes downloaded, and it is only real while those chunks stay out of the static import graph.

| #   | candidate (branch)                                                             |                                                                                                 first-visit KiB |     FCP median |       LCP median | risk                                                                                                            | files                                  | risk floor?                                     | over threshold?          |
| --- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------: | -------------: | ---------------: | --------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------- | ------------------------ |
| 1   | Sentry started after first paint, from its own chunk (`sentry-late`)           |                                                                                               **-27.6** (172.2) |     2523 (-93) |       4540 (-85) | medium: an error thrown before the chunk arrives is lost; `RouteErrorBoundary` reports through a dynamic import | `main.tsx`, `RouteErrorBoundary.tsx`   | no                                              | **yes, 27.6 KiB**        |
| 2   | Firebase app and Analytics loaded on idle (`analytics-idle`)                   |                                                                                               **-14.7** (185.1) |     2548 (-68) |       4553 (-72) | low to medium: first page view is sent later; `setDefaultEventParameters` ordering kept                         | `analytics.ts`, new `analytics-sdk.ts` | no                                              | **yes, 14.7 KiB**        |
| 3   | 1 and 2 together (`sentry-and-analytics`)                                      |                                                                                               **-42.4** (157.4) |    2374 (-242) |      4382 (-243) | as 1 and 2                                                                                                      | both sets                              | no                                              | yes, 42.4 KiB            |
| 4   | Remove the latin 700 preload (`preload-700`)                                   |                                                                                                     0.0 (199.8) |    2444 (-172) | **3117 (-1508)** | medium: the issue #115 swap of the name may return; the mechanism of the LCP gain is not established            | `index.html`                           | no (but `index.html` forces an Inspector build) | **yes, 1508 ms**         |
| 5   | Remove both font preloads (`preload-none`)                                     |                                                                                                    -0.1 (199.7) |    2324 (-292) |     3088 (-1537) | as 4, plus the 400 face for body text (issue #124)                                                              | `index.html`                           | no                                              | yes, 1537 ms             |
| 6   | MUI: `PageLoading`'s `CircularProgress`/`Container`/`Stack` in the first chunk |                                                                        about -3 (upper bound, from the treemap) | not prototyped |   not prototyped | low                                                                                                             | `PageLoading.tsx`                      | no                                              | no                       |
| 7   | Home's SVG street                                                              |                                                                         4.9 in the entry; no smaller form tried | not prototyped |   not prototyped | design                                                                                                          | `Street` files                         | no                                              | no                       |
| 8   | Emotion's runtime                                                              | part of the 28.1 shared MUI chunk (stylis 2.2, is-prop-valid 2.0, cache 1.9); not separable without leaving MUI | not prototyped |   not prototyped | high                                                                                                            | wide                                   | no                                              | no, not a bounded change |

Desktop (five runs, `/`): base FCP 93, LCP 2094; candidate 3 FCP 78, LCP 2081. No candidate changes desktop LCP by more than 13 ms.

Three things the table does not say by itself:

- **1 and 2 are the same kind of saving and nearly the same size on the critical path as on the weight check**: 242 ms of FCP for 42.4 KiB at Slow 4G. The weight check will show -42.4 KiB, but a total-bytes budget would not move.
- **4 and 5 are the largest LCP movement and the least understood.** The LCP element is the first paragraph; Lighthouse's breakdown is all element render delay (4752 ms base, 3080 ms without the 700 preload). The bytes are identical, so the gain comes from what the two preloads compete with or gate, not from size. Before an issue is built on it, someone must find out why (the fonts' priority against the scripts at Slow 4G, or an entry animation waiting on them) and check by eye that the name of the game does not jump (#115, #124). One run set, one device profile.
- Candidate 6: the three components also appear in the route chunks; the figure is an upper bound read from the treemap, not a build.

### Candidates over the threshold (5 KiB or 100 ms median mobile LCP)

1. Sentry after first paint: 27.6 KiB, FCP -93 ms, LCP -85 ms.
2. Firebase app and Analytics on idle: 14.7 KiB, FCP -68 ms, LCP -72 ms.
3. Both of the above: 42.4 KiB, FCP and LCP -242 ms. If issues are cut one per candidate, 3 is their sum and not a third issue.
4. Remove the latin 700 preload: LCP -1508 ms, 0 KiB.
5. Remove both preloads: LCP -1537 ms, -0.1 KiB. Same investigation as 4.

Not over the threshold, closed here: 6 (about 3 KiB), 7 (4.9 KiB at most, no candidate shape), 8 (no bounded change).

None of the five touches `vite.config.ts`, `apps/web/build/`, `firestore.rules` or a workflow. They do not need the ceiling in `first-visit-weight.ts` to move, and this report does not lower it. After 1 and 2 land the check would read about 157 KiB, which makes the 218.0 KiB ceiling loose by 60 KiB; that is Viktor's decision (ADR 0032).

## Not measured, and why

- **Prototypes on `/room/<id>`** and on the desktop profile (other than candidate 3): time. The room is the most common first visit and has the largest unexplored saving (`firebase-room` is 143.6 KiB and arrives after FCP; Firestore and `re2js` are about 111 KiB of it). It needs a pass of its own.
- **Real Google Analytics traffic**: the dummy build has no measurement ID, so `gtag` was never fetched. A production first visit has that third-party request, unmeasured here.
- **Sentry with a DSN**: no DSN in this build, so `init` was a no-op; the 28 KiB chunk's download was measured, its execution with a DSN was not.
- **A deploy build** (the Sentry plugin adds about 1.6 KiB) and **brotli**.
- Candidates 6 to 8 as prototypes (stated in the table).
- The first-time `pnpm dlx` fetch of Lighthouse distorted one early run; it was discarded and replaced.
