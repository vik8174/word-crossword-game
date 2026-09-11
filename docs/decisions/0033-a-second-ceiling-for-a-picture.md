# 0033. A second ceiling for a picture

Status: Accepted

## Context

Issue #151 is the tracer bullet of the 1.3.0 redesign: it takes `/` off the
procedural garden entirely and stands it on `gate.avif`, a photograph rather
than a few thousand brush strokes. Nothing else on the release could be sized
until a real build had drawn a real picture, because nobody knew what a
painted scene compresses to until one existed.

It compresses badly. Brush texture is exactly the kind of detail a lossy
codec spends bits on, and the numbers measured against the actual artwork (PRD
#145) make that concrete:

|          | 1440×810 | 1200×675 | 960×540 |
| -------- | -------- | -------- | ------- |
| AVIF q50 | 165 KiB  | 127      | 86      |
| AVIF q40 | 112      | —        | —       |
| WebP q72 | 267      | 208      | 145     |
| JPEG q72 | 301      | 221      | 148     |

`FIRST_VISIT_CEILING_BYTES` was 218 KiB with 1.1 KiB of headroom on the
Deploy build before this ticket (ADR 0032). No format or size in that table
leaves it intact, and the recorded decision that the ceiling would not be
raised again (PRD #145, "Byte budget: load per route") was made before anyone
had measured a picture rather than a placeholder.

## Decision

**The ceiling splits into two**, and each one measures a different thing:

| ceiling                                                              | covers                                                                                 | value                  |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------- |
| `FIRST_VISIT_CEILING_BYTES` (`apps/web/build/first-visit-weight.ts`) | the HTML, every chunk reachable by static import, and every typeface the HTML asks for | **218 KiB, unchanged** |
| `SCENE_IMAGE_CEILING_BYTES` (`apps/web/build/scene-weight.ts`)       | the one scene image a route draws itself with                                          | **180 KiB per scene**  |

180 admits the heaviest picture this release measured at the widest
breakpoint it ships at — the gate at roughly 160 KiB, AVIF, q50, 1440×810 —
with room for a careless re-export to still be caught rather than passed
through, and not so much room that an uncompressed picture could slip by.

The two ceilings are checked by two separate build steps. `capFirstVisit`
(unchanged) sums the HTML, the chunks and the fonts and fails if the total is
over 218 KiB. `capSceneImages` (new) reads every file Vite copies out of
`public/scenes/` into the built output and fails if _any one of them_ is over
180 KiB — a scene is paid for once per route, not added to the pictures no
other route fetches, so this is a per-file ceiling rather than a sum.

**A scene image counts against neither total by accident, and only on the
address that draws it.** `/` preloads `gate.avif`, for the same reason a
typeface is preloaded — a route rendered by React only starts fetching an
image once the bundle has executed, and a picture arriving after the screen
around it is already the largest thing on that screen. But it cannot be a
plain `<link rel="preload">` written into `index.html`: Firebase Hosting
rewrites every address in the app to that one document
(`build/route-preload.ts`), so a tag written into it by hand would preload
`gate.avif` for `/create`, `/join` and `/room/<id>` too, none of which
`GateScene` ever draws — exactly the cost per route this ADR says a scene must
never carry. `build/scene-preload.ts` solves it the way `route-preload.ts`
already solves the same problem for a room's chunks: a script, injected into
`<head>`, that checks `location.pathname` once the browser already knows it
and creates the `<link>` itself only on `/`.

Because the preload is a script rather than a `<link>` tag in the built HTML,
it was never at risk of being counted by
`first-visit-weight.ts#preloadedHrefs`, which only reads literal `<link>`
tags. That function is filtered to `as="font"` regardless, as a second guard
against a future static `<link rel="preload" as="image">` being added back by
hand and silently folded into the 218 KiB total.

**This does not reopen ADR 0032's protection.** That ADR exists to stop
_code_ drifting back up unnoticed — a few thousand brush strokes, a library
pulled in by one import. That protection is untouched: `FIRST_VISIT_CEILING_BYTES`
still measures exactly what it measured, at exactly the same number. What is
new is a second, separate number for the price of a painting, because a
painting and a script are not the same kind of cost and tying them into one
total would mean neither number could move for its own reason.

## Consequences

**Deleting the gate's painting path freed almost nothing, and that is itself
worth recording.** The boundary #151 draws keeps `/create`, `/join` and every
room screen on the procedural forest, so the actual brush strokes — `paint-scene.ts`,
`paint-landmarks.ts`, the torii itself — are still reachable from other routes
and could not be deleted here. What came out was `garden/gate-chrome.ts`
alone, a small position-calculation module with no drawing in it, replaced by
`scenes/gate-chrome.ts` of about the same size. Measured on the Deploy build
(`sourcemaps.disable: 'disable-upload'`, no real token or upload needed — the
weight comes from the debug ids the plugin stamps into chunks, not from
sending them anywhere): **216.7 KiB before this ticket, 216.8 KiB after**, a
first visit **0.1 KiB heavier** rather than lighter. The CI-style build (no
token) moves by the same 0.1 KiB, from 215.4 to 215.5. Nobody could have known
this figure before the build produced it, which is the entire point of a
tracer bullet — and what it found is that the code freed by this ticket alone
is close to zero, not the large number the phrase "deletes the gate's painting
path" suggested going in. The large deletion — the whole `paint-*` family,
5,682 lines of non-test code per `handoffs/scenes/component-inventory.md` — is
still ahead of the release, in the ticket that takes `/create` and `/join` off
the garden too.

**A second scene changes nothing about how this works.** `doors.avif` and
`hall.avif`, when their tickets arrive, are more files in `public/scenes/`
that `capSceneImages` checks the same way — no new plugin, no change to
either ceiling's value, because each scene is still paid for by the one route
that draws it and never added to another.

**The gap between the CI build and the Deploy build is still open.** ADR 0032
already recorded it and it is not this ticket's to close: a build with
`SENTRY_AUTH_TOKEN` set uploads source maps and comes out roughly 1.5 KiB
heavier than the one CI checks, on the same commit. Both ceilings in this
file are numbers a build can be measured against; which build measured them
still has to be said every time one is quoted.
