# 0003. Firestore instead of Realtime Database

Status: Accepted

## Context

Firebase offers two real-time databases: Realtime Database (RTDB) and Firestore. Both provide the synchronization the game needs.

## Decision

Use Firestore.

## Consequences

- A more convenient query model (useful even in the MVP — for example, a future list of active rooms)
- A more natural document structure for "room → players → words → cell state"
- Firestore is Google's recommended choice for new projects; RTDB is effectively in maintenance mode for legacy applications
