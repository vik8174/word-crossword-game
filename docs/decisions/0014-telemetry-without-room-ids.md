# 0014. Telemetry that cannot name a room

Status: Accepted

## Context

[Issue #11](https://github.com/vik8174/word-crossword-game/issues/11) asks for two integrations that report to services outside this project: Firebase Analytics for a handful of product events, and Sentry for JavaScript errors and unhandled promise rejections.

Both are read-only additions to the app — neither changes a rule of the game — and yet both start out doing the one thing the previous three tickets were spent preventing.

A room lives at `/room/<id>`, and that id **is** the access control around it. The security rules say `allow get: if isSignedIn()`, so any signed-in client that can name a room reads the whole document: the crossword, every word in plain text, who is meant to guess which ([ADR 0004](0004-ui-only-word-visibility.md) hides words in the UI and nowhere else, [ADR 0010](0010-letterless-grid-and-private-word-list.md) keeps them out of the DOM). The link is the invitation because the id is the key.

Neither SDK is told this, and both ship the address by default:

- Firebase Analytics sends a `page_view` on start-up, with `page_location` set to the address bar as it stands. `gtag` also fills `page_location` in on every subsequent event by itself
- Sentry puts the address into `request.url` and into every navigation breadcrumb; browser tracing would report each navigation as a transaction, and session replay would record the DOM

So the choice was not whether to add telemetry, but what shape it has to have before it may be added.

## Decision

**Nothing leaves the browser without going through `apps/web/src/telemetry/redaction.ts`.** It replaces `/room/<id>` with the route pattern `/room/:roomId`, and the Firestore document path `rooms/<id>` — the spelling Firebase uses in the message of a refused read or write — with `rooms/:roomId`.

Each SDK then has exactly one door:

**Analytics.** The automatic page view is switched off (`initializeAnalytics(app, { config: { send_page_view: false } })`) and replaced by one this app sends itself, carrying the redacted path. The same redacted address is set as a default event parameter, because `gtag` would otherwise read the address bar for every later event — and it is set _before_ Analytics is started rather than after, since Firebase holds default parameters until initialization and applies them to its first `gtag` call. Not even the events GA4 opens a session with can then carry the raw address. Turning the automatic page view off buys a second thing worth having: page views now follow client-side navigation, which the automatic one never did — it fires once, at load, and this app routes without loading.

**Analytics events carry numbers and nothing else.** `GameEventParams` is `Readonly<Record<string, number>>`, so an event naming a room, a player or a word does not compile. This is the same device as `RoomUpdate` in [ADR 0013](0013-keeping-a-room-alive-on-every-write.md): the rule is enforced by the type system rather than by remembering it. A page view is the one thing that may carry text, and its fields are of the branded type `Redacted`, which only the redaction function produces.

**Sentry.** Started with its default integrations and no others. `beforeSend` runs the whole event — not a list of fields known today to hold a URL — through the redaction, so an SDK release that starts reporting the address somewhere new is already covered. There is no depth at which the redaction gives up looking either, for the same reason: a limit would be a place a room id could sit and still be sent. Without tracing and without replay, `beforeSend` is the single exit from the browser.

**Neither browser tracing nor session replay is switched on.** They would send exactly what this app is careful not to.

**The Sentry environment comes from `VITE_SENTRY_ENVIRONMENT`, not from the build mode.** Stage and production are both built as `production` ([ADR 0007](0007-stage-only-environment.md)), so a guess from `import.meta.env.MODE` would file stage errors under a deployment they did not come from. A build that did not say reports itself as `unknown` rather than as either.

## Consequences

- Analytics answers how many rooms are created, how many players join and how many games are finished, and cannot answer which room, which player or which words. That is the intended ceiling, not a gap to close later
- A room id leaking into telemetry would need a new code path that avoids both doors. Adding an event cannot do it — the parameter type refuses strings — and neither can an SDK upgrade, since the whole Sentry event is redacted rather than named fields
- Errors are reported with minified stack traces. Uploading source maps needs `@sentry/vite-plugin` and an auth token as a CI secret, which is its own ticket; it is deliberately not part of this one
- Page views are this app's to send. A route added without a thought for telemetry is still reported, because the hook watches the router rather than the pages — but a future address holding an identifier of its own would need its own redaction, and nothing would announce that
- Analytics is initialized behind `isSupported()`, so a browser without it, a jsdom test, or a build with no measurement id simply sends nothing. Every failure in this area ends in a console warning: a game must be playable with telemetry entirely broken
- Sentry does not start at all without a DSN, which is the state of a fresh checkout and of every test run
- Redaction is a regular expression over strings, so it protects the two spellings of a room id that exist today. A third one — an id put into a query parameter, say — would pass through it. What makes that unlikely rather than merely unlucky is that page views are built from `origin` and `pathname` only: a query string is not read at all
