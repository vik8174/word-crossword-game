# 0008. Crossword layout library and the `CrosswordLayout` contract

Status: Accepted

## Context

The PRD ([issue #1](https://github.com/vik8174/word-crossword-game/issues/1)) named `crossword-layout-generator` as an example layout library, not as a mandatory choice. Both decisions — which library builds the grid, and what shape its result takes — are hard to reverse: `CrosswordLayout` is written into the Firestore room document, and `word-assignment`, grid rendering, and guess checking will all bind to it.

Candidates evaluated (measurements over 120 sets of 10/15/20 words from everyday vocabulary, plus edge-case sets):

|                               | `crossword-layout-generator@0.1.1` | `crossword-generator-x@1.0.0` | `crossword-generator@1.0.1` |
| ----------------------------- | ---------------------------------- | ----------------------------- | --------------------------- |
| Latest release                | 2020                               | 2026-03                       | 2025-09                     |
| Downloads/month               | ~8,200                             | ~86                           | ~1,200                      |
| TypeScript types              | no                                 | yes                           | yes                         |
| Format                        | CJS                                | ESM + CJS                     | CJS                         |
| Dependencies                  | 0                                  | 0                             | 0                           |
| Words unplaced (avg/max)      | 0.28 / 3                           | 0 / 0                         | —                           |
| Three-letter words (10 given) | 4 of 10 unplaced                   | 0 of 10                       | —                           |
| Deterministic                 | yes                                | no (`Math.random`)            | no                          |

`crossword-generator@1.0.1` was ruled out immediately: it randomly **selects a subset** of the words (`selectRandomWords`), discarding words that would have fit — which directly contradicts user story 17.

`crossword-layout-generator` unconditionally writes one line per word to `console.log` on every call (`layout_generator.js:78`) — noise in a production browser, and the library offers no way to turn it off.

## Decision

**Library:** `crossword-generator-x@1.0.0` (exact version, MIT, no dependencies). It is the `crossword-layout-generator` algorithm rewritten in TypeScript with backtracking added; its source (399 lines) was read in full — pure computation, no I/O.

The cost of this choice is a young package with roughly 86 downloads per month. The risk is accepted deliberately and offset as follows:

- the `crossword-generator` module is the only place in the codebase that knows about the library; replacing it means changing one file
- the library's output is treated as external input: only what can be traced back to a specific input word is used, and a placement that contradicts an already-written letter is rejected (the word goes to `unplacedWords`, the grid is not corrupted)
- tests verify invariants rather than a specific grid, so they survive a library swap
- fallback if the package turns out to be problematic: `crossword-layout-generator` with a local type declaration and its `console.log` suppressed

**Contract:**

```ts
interface CrosswordLayout {
  rows: number;
  cols: number;
  cells: CrosswordCell[]; // { row, col, letter } — lettered cells only
  placedWords: PlacedWord[]; // { word, orientation, cells: GridPosition[] }
  unplacedWords: string[];
}
```

- **Flat arrays instead of a two-dimensional grid.** Firestore does not store an array directly inside another array, and the layout is written into the room document as is — so `string[][]` is impossible in principle. `cells` is a flat list of cells with coordinates; empty cells are simply absent.
- **Zero-based coordinates**, `row`/`col`, with the grid cropped to the words (the minimum is always 0).
- **Intersections are not stored as a separate list** — an intersection is a cell that belongs to the `cells` of two words. A separate field would duplicate data inside a document that is edited during play.
- **Words are returned exactly as the owner typed them**; letters in the grid are uppercase.
- **`placedWords` plus `unplacedWords` always equals the input list.** No word disappears silently. A word the module cannot match to the layout (for example one with surrounding whitespace, which the validator would reject anyway) comes back in `unplacedWords` rather than breaking the grid.
- **Word-list validation does not belong here** (count, length, alphabet, duplicates) — that is `word-list-validator`.

## Consequences

- The layout is **not deterministic**: the same words produce different grids across calls. Harmless for the game (the grid is generated once and stored), but tests against an exact grid would be flaky — hence the invariant-based tests
- The whole `CrosswordLayout` serializes into the Firestore document with no transformation
- `cells` inside `PlacedWord` duplicates information derivable from the first cell, the orientation, and the word length — a deliberate trade-off: rendering and guess checking get the word-to-cell binding without recomputation, and the layout never changes after the room is created
- A word set where nothing intersects yields an empty layout (`rows: 0`, every word in `unplacedWords`) rather than an error — the UI must surface this as a warning to the owner
