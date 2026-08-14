# 0002. No backend of our own — clients write directly to Firestore

Status: Accepted

## Context

The MVP needs real-time synchronization of game state across 2-4 browser clients (the crossword grid, guessing progress). Three options were considered: (a) a backend server of our own with a WebSocket channel, (b) Firebase Cloud Functions as an intermediate layer over Firestore, (c) clients reading and writing Firestore directly through the client SDK.

## Decision

Clients talk to Firestore directly through the client SDK, with no server of our own and no Cloud Functions. All game logic (crossword generation, word assignment, guess checking) runs on the client before the result is written to Firestore.

## Consequences

- Minimal infrastructure for the MVP — there is no server to deploy or maintain
- There is no single point of control over write correctness (a client can technically write arbitrary data) — acceptable for a game played among people who know each other (see [0004](0004-ui-only-word-visibility.md))
- Stale rooms are cleaned up by Firestore's built-in TTL, with no cron job or Cloud Function
- If the product outgrows the MVP (public matchmaking, anti-cheat, paid features), this decision will have to be revisited
