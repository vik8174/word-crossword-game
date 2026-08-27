# 0028. A design system inside the MUI theme

Status: Accepted

## Context

There is no design system. `apps/web/src/theme.ts` is nineteen lines holding two colours, and its own comment admits what it is: "Kept minimal for now — palette/typography will evolve as real screens are built in later issues." The screens are built. [Issue #101](https://github.com/vik8174/word-crossword-game/issues/101) gave the room the whole window and put the board in the middle of it, so what is left unbuilt is the look of the thing that is now on screen.

One question had to be answered before any of the rest, and it is not a question about colour: **does MUI stay?** [Issue #93](https://github.com/vik8174/word-crossword-game/issues/93) says so in as many words — it will not choose how a screen transitions until this is settled, because the transition components it would use are MUI's and exist only while MUI does. A palette chosen first and a library chosen second would be a palette chosen twice.

Taking MUI out was considered, and it was refused by measurement rather than by taste. At the commit this record is written against, **26 of the 29 non-test `.tsx` files import from `@mui/material`** directly, and the remaining three render components that do — `RoomFinished` and `RoomJoin` are compositions of panels, and `main.tsx` renders the app. `Typography` appears in eighteen of those files, `Stack` in thirteen, `Alert` in eleven, `Button` in nine, and then `Container`, `Box`, `TextField`, `List`, `Dialog`, `Chip`, `CssBaseline`, `CircularProgress`. Removing the library is therefore not a swap of a styling technique: it is rewriting twenty-six files, and rebuilding by hand the keyboard behaviour and the screen-reader roles that `Alert`, `Dialog` and `List` are giving away for free today. On the other side of the ledger, `Fade`, `Slide` and `Grow` are already in the bundle, so the movement of [#93](https://github.com/vik8174/word-crossword-game/issues/93) and [#103](https://github.com/vik8174/word-crossword-game/issues/103) costs zero new bytes while MUI is there and a dependency the moment it is not.

What was weighed:

- **Take MUI out, style by hand.** The measurement above is its price, paid at once, in exchange for bytes this project has never been short of and accessibility it would then owe itself.
- **Keep MUI and put the tokens beside it**, in a module of their own that components import directly. Cheap to write and it creates the one thing a design system cannot survive: two places that both answer "what colour is this". `Button` and `Alert` would keep reading the theme while everything hand-written read the other file, and the day they disagree is the day nobody can tell which is right.
- **Keep MUI and theme it, tokens inside the theme.** What is decided below.

There is a trap in the direction itself, and it is worth naming here rather than discovering it on a board. A refused guess is painted `error.light` on an `error.main` border (`apps/web/src/components/GridSquare.tsx`). Cherry blossom is pink. If the player's own squares become sakura pink, then "this square is mine" and "this answer was refused" differ by a shade of the same colour, and the player stops being told that the app rejected what they typed. [0015](0015-explained-words-in-the-grid.md) already holds the harder version of that line: the difference between a word this player explains and a word the pair has answered has to survive greyscale, which is why it is carried by a dashed border and italics rather than by hue at all.

## Decision

**MUI stays, and it is themed rather than wrapped.**

**The tokens are declared inside the theme, through module augmentation.** They are typed and complete themselves in an editor, and MUI's own roles — `primary`, `secondary`, `error`, `success` — point at those same tokens, so `Button` and `Alert` keep working untouched. There is no second source of truth about colour, and nothing outside the theme holds a colour literal.

**The direction is Japanese** — calm, space, ink on paper, rather than an admin panel. The token names say so in the code and not in a comment beside it:

| token    | what it is                                 |
| -------- | ------------------------------------------ |
| `washi`  | warm neutral ground, paper                 |
| `sumi`   | dark ink: body text, the lines of the grid |
| `sakura` | the accent that carries the atmosphere     |
| `matcha` | the second accent                          |

**Sakura is atmosphere, never grid semantics.** The board stays sumi on washi with one calm accent for the squares this player fills in. Pink lives where nothing is being read closely: backgrounds, the lobby, buttons, the end of a game.

**The theme is declared on `colorSchemes`, not on `palette`**, with exactly one scheme in it. There is no dark theme in this release, and adding one later is a second object rather than a migration — the move between those two APIs would otherwise touch every component that reads a colour from the theme. Dark is left out deliberately: the whole semantics of the board would have to be chosen and then checked twice, by hand, and the pre-tag checklist is long enough already.

**The interface stays on the system font stack** — zero bytes, drawn on the first frame, no flash of an unstyled first screen. **One font is loaded, for the letters in the grid and for large headings**: the squares are the one thing a player looks at for twenty minutes together, and that is where the character of a typeface is worth its transfer. It is loaded with `font-display: swap`, so the board is drawn immediately in the system font and swapped afterwards, and **with a Latin subset only** — the game is about English today, the validator refuses anything else with `word-not-latin`, and a face carrying Cyrillic as well costs many times more (see [`../future-modes.md`](../future-modes.md)).

**No colour values are written into this record.** It fixes the mechanism and the direction; the palette itself is built in [#102](https://github.com/vik8174/word-crossword-game/issues/102) and lives in the theme, which is the only place it can be read from without becoming a second copy.

## Consequences

- `theme.test.ts` stops guarding a constant and starts guarding a property. Asserting `primary.main === '#1565c0'` protects the value against being changed, which is the opposite of what a palette needs. What replaces it is what the palette actually promises: sumi on washi at a contrast of at least 4.5:1, the four states of a square (empty, mine, mine to explain, answered) told apart in greyscale, and the accent of a player's own squares differing from `error` by more than hue
- The greyscale rule is a real constraint on the palette rather than a note about accessibility, and it can refuse a colour that looks right. A player who confuses "I explain this word" with "we have answered it" stops explaining, and the game stops with both people waiting ([0015](0015-explained-words-in-the-grid.md))
- [#93](https://github.com/vik8174/word-crossword-game/issues/93) is unblocked and keeps its transitions free: `Fade`, `Slide` and `Grow` ship whether they are used or not
- Anything that needs a colour reads it from the theme. A literal in a component is the thing to catch in review, because it is how the second source of truth grows back
- The Latin subset ties the typography to a limit the code already has. A language outside the Latin alphabet is not one setting but a validator, a font and a layout, which is why it is a plan rather than a task ([`../future-modes.md`](../future-modes.md))
- The measurement is written down so it is not taken again. It is a reason with a date on it: rewriting the UI layer would change the number without changing the shape of the argument, and the argument is the part to re-read before proposing the swap a third time
