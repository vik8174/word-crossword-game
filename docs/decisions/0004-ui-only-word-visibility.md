# 0004. Hiding words at the UI level only, not through Security Rules

Status: Accepted

## Context

Every word in the game is hidden from exactly one player (the one who has to guess it) and visible to the rest. With clients reading Firestore directly ([0002](0002-no-dedicated-backend.md)), the data can be hidden in two ways: (a) not rendering the hidden word in the UI even though it is physically present in the fetched document; (b) splitting the data into sub-documents with Firestore Security Rules that forbid a specific player from reading a specific field or document.

## Decision

For the MVP, option (a) — hiding at the UI level only. A player can technically read a word "hidden" from them via DevTools or the network tab if they deliberately set out to.

## Consequences

- A simple data structure — the whole room state lives in one document, with no split into sub-collections by access rights
- Cheating is technically possible, but this is a game played among people who know each other on a basis of trust, not a competition with stakes — the risk is accepted for the MVP
- If public matchmaking with strangers or any competitive mode with stakes appears later, this decision must be revisited in favor of option (b)
