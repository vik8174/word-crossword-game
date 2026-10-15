# 0038. Across the Street replaces the garden

Status: Accepted

## Context

On 2026-10-14 Viktor chose design v2, "the street" (variant L, [#219](https://github.com/vik8174/word-crossword-game/issues/219)), and rejected the garden of the 1.3.0 design. The 1.3.0 issue of the garden design ([#139](https://github.com/vik8174/word-crossword-game/issues/139)) was closed as not planned. The game is called Across the Street from the same day.

The garden was a whole look, and each part of it was recorded as its own decision: three photographs of a temple with a veil laid over them, petals falling in front, a cloth drawn across the table at the end of a game, four colours with Japanese names, two typefaces and a logotype, and a second weight ceiling for the pictures. The street shares none of it. It is a flat ground, tiles with an outline, one typeface, and a drawing of a street that is built into the screens one at a time (`design/templates/state-tree.html`).

The work was too large for one issue and was cut in four on 2026-10-14, in the order below. This record is the decision that all four make together. It is written once, when the first of them to remove anything merges, so that the people and the agents who open the project afterwards do not have to reconstruct why a record about petals sits beside code with no petals.

The alternatives considered:

- **Keep the garden under the street's tokens.** Rejected by the choice of design: the photographs, the veil and the petals are the look that was refused, and a flat ground does not need a veil to be read
- **Redraw every screen in one issue.** Rejected: an issue that touches every screen cannot be checked without asking its author. The cut below leaves each screen standing in its old layout on the new ground until its own issue
- **Leave the garden in the code, switched off.** Rejected: about 5 700 lines, three pictures in two formats each, two build plugins and a second weight ceiling, kept for a look nobody will turn back on

## Decision

**The tokens ([#243](https://github.com/vik8174/word-crossword-game/issues/243)).** The street's colours are 14 named tokens and 4 derived values, declared once in `apps/web/src/street.ts` and handed to the MUI theme as `theme.palette.street`. A colour is chosen by its role and never by its name: `duck` the ground, `tile` squares and cards, `ink` text and outlines, `slate` secondary text, `spruce` the action, `ochre` the lit window, `line` rules, `brick` refusal and error ink. Two rules come with them. **`ochre` is a fill and never a text colour**; it reads 1.4:1 on the ground. **`brick` is text on a tile or on the ground only**: on `rose` it reads 4.31:1, and the text on `rose` is `ink` (9.31:1). The eight text sizes of the drawing are theme variants (`title`, `stepTitle`, `lede`, `heading`, `body`, `label`, `hint`, `small`); a component may set its own size, and the screens that have not been redrawn do.

**The face ([#244](https://github.com/vik8174/word-crossword-game/issues/244), [#232](https://github.com/vik8174/word-crossword-game/issues/232)).** One typeface, Alegreya Sans, in 400, 700 and 400 italic, latin only, self-hosted and preloaded. The range of the latin files is the stock `latin` range of Google's CSS API, held in one constant, `LATIN_RANGE`, that a test checks against both static HTML files that declare the faces. It moved with #232 to `packages/shared/src/font-ranges/font-ranges.ts`, beside `LATIN_EXT_RANGE`, and `apps/web/src/font-faces.ts` re-exports both. The latin-ext files are self-hosted, never preloaded and counted apart, under a second ceiling ([0032](0032-what-the-first-visit-ceiling-measures.md), addendum of #232; [0040](0040-words-in-any-latin-alphabet.md)). The sign face and the logotype face are deleted.

**The removal and the colour roles (this issue, [#222](https://github.com/vik8174/word-crossword-game/issues/222)).**

- The garden is deleted: its three scenes, the petals, the veil, the cloth, the scene ceiling and the two build plugins that read the pictures. No route renders a `<canvas>`. The first-visit ceiling stays.
- The page is `duck` on every route, painted on the body by `CssBaseline` from the theme, with `ink` text at 18 px on a line of 1.5. In the workshop a decorator paints `duck` behind every story.
- Every colour a screen declared moves onto the token of its role, and the theme (`theme.ts` and `street.ts`) is the only place a colour is written. MUI's `primary`, `secondary` and `success` are spruce, `error` is brick with MUI's own darker shade as `dark`, `warning` is ochre under ink, `info` is slate.
- A band becomes a tile with a 1.5 px `line` outline. The outline is drawn with `outline` and an offset that pulls it inside the box, so a surface keeps its size and its content does not move.
- Every shadow that was drawn to lift an element off the picture is dropped. A focus indicator was not, so it stays, in spruce, in the shape it had. A field's invalid edge becomes brick, so focus and invalid stay distinct.
- The board's squares keep the colours they have, as literal values in the theme, until [#228](https://github.com/vik8174/word-crossword-game/issues/228) redraws the game room. The test that tells the four states of a square apart without colour (ADR 0015) passes unchanged.
- These colour choices are interim. They are judged on one bar, that every text reads at least 4.5:1 against the surface behind it, and not against the drawing; each screen is held to the drawing by its own issue.
- The app is called Across the Street in its `<title>` and on the landing page. The Japanese token names are gone.

**The frame ([#245](https://github.com/vik8174/word-crossword-game/issues/245)), as it is to be built.** A header with the name across the top of every route, a slot for a screen's status line and its one action, mounted once outside the `Suspense` boundary and outside the screen shift. It shares the window: the screen takes the rest of the height, and the board's height is today's figure less the header's rendered height only where the room is one window (768 by 600 and up). On a phone the room is a page that scrolls, the board keeps its share of the window, and the header adds to the page, so no board scrolls inside a scrolling page (ADR 0029). The header's height is read from one custom property that the frame sets by measuring its own header, with 64 px as the fallback for a story that has no frame.

**What this record supersedes.**

- [0028](0028-a-design-system-inside-the-mui-theme.md), in part: the four Japanese token names and the Japanese direction. The mechanism stands: MUI stays and is themed, the tokens are inside the theme, the theme is declared on `colorSchemes` with one scheme, and nothing outside the theme holds a colour.
- [0030](0030-where-movement-is-allowed.md), in part: the garden half, which is the petals and the greeting cloth. The motion half stands until [#230](https://github.com/vik8174/word-crossword-game/issues/230): the screen shift keyed on which screen is showing and never on a render, the silence during a game, and `prefers-reduced-motion` switching movement off.
- [0031](0031-one-camera-and-what-it-promises.md), whole. It records the greeting cloth and the camera that the three photographs replaced; none of them exists.
- [0033](0033-a-second-ceiling-for-a-picture.md), whole. There are no pictures, so there is no second ceiling. [0032](0032-what-the-first-visit-ceiling-measures.md) is back to being the only one.
- [0034](0034-one-text-family-and-a-logotype.md), whole. There is one family, and no logotype face.

## Consequences

- The screens are on the new ground in their old layouts until their own issues merge: Home until #224, Create until #225, Connecting, Join, the refusals and the not-found page until #226, the lobby until #227, the game room until #228, Finished and Game ended until #229. They are readable and not yet right. The frame with the name is missing until #245, and movement stays the old shift until #230.
- A finished game is answered by its panel alone for now. The cloth went with the garden, and the ending screens are redrawn under #229.
- A page with no picture needs nothing to read text off, so the veil, the band and the cream ink that carried it are gone, and so is the rule that text on a band is dimmed. Secondary text is `slate`.
- The workshop has one ground for every story, `duck`, and a story no longer names a scene.
- A new colour is a new token in `street.ts`, chosen for a role, and a module that wants one declares nothing of its own. The test of that is a search: no module but the theme holds a colour literal, with the board's squares as the one exception for now.
- The weight of a first visit falls with the code the garden took with it. The ceiling of [0032](0032-what-the-first-visit-ceiling-measures.md) is not lowered by this, and room that is freed is not a budget to spend.
