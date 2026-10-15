# 0040. Words in any Latin alphabet

Status: Accepted

Refers to [0032](0032-what-the-first-visit-ceiling-measures.md) (the second ceiling, in its addendum), [0038](0038-across-the-street-replaces-the-garden.md) (the face) and [0011](0011-typing-guesses-into-the-grid.md) (typing into the grid).

## Context

The game is a tool for practising a spoken language, and it accepted English letters only: the validator took `/^[A-Za-z]+$/`, the guess was compared as `trim().toLowerCase()`, and the board upper-cased in four places (the layout library, `generateCrossword`, `letterTyped` and a CSS `text-transform`). Viktor decided on 2026-10-14 ([#219](https://github.com/vik8174/word-crossword-game/issues/219), [#232](https://github.com/vik8174/word-crossword-game/issues/232)) that words may use Latin letters with diacritics (ñ, á, ü, ç, ß and the like), that a guess ignores accents and case ("cafe" answers _café_), and that once answered the board shows _café_. Cyrillic and Greek are not part of this.

Three facts made it more than a regex. The library upper-cases the words it is given, so _straße_ came back as `STRASSE`, seven squares for a word of six. An accent can arrive as one character or as two (`é` or `e` and U+0301), and the square's `maxLength={1}` cut the second form to `e` before `onChange` ran. And "the same letter" is not obvious: `ı` upper-cases to `I`, so the board already draws _kapı_ as `KAPI`.

## Decision

**The alphabet is the two ranges Alegreya Sans is declared for.** A letter is accepted when it is a Latin letter (`\p{Script=Latin}` and `\p{L}`) and lies in `LATIN_RANGE` or `LATIN_EXT_RANGE`. Both are written once, in `packages/shared/src/font-ranges/font-ranges.ts`: the validator, the app, the build's weight check and the two static HTML files read them. Everything else is refused: most of the Vietnamese block (U+1EA0 to U+1EF1), fullwidth letters, astral letters, Cyrillic, Greek.

**A letter inside the ranges that the face does not draw is accepted and drawn in the face the reader's system falls back to.** The two ranges hold 1,136 Latin letters, of which 1,129 are accepted (the seven that cannot fill one square are refused), most of them phonetic or medievalist (U+1D00 to U+1DBF, U+A720 to U+A7FF). Checking each file's glyph table would need a font tool this project does not have, and the letter is a letter. Ɐ (U+2C6F) is one. Viktor confirmed this on 2026-10-15.

**Words are NFC.** The validator composes each word to NFC and returns the composed words, and those are what reach the generator and the room. A decomposed _café_ and a precomposed one are one word of four letters. Length is counted in letters after NFC: _straße_ is 6, _ñandú_ is 5.

**One square holds one letter, in every form the app gives it.** The board draws a word as `gridLettersOf` makes it: NFC, upper case, accents kept, and **ß as ẞ** (U+1E9E), because the plain upper case of ß is two letters. Every Latin letter whose upper case is still longer than one character (ŉ ǰ ẖ ẗ ẘ ẙ ẚ and the ligatures ﬀ ﬁ ﬂ ﬃ ﬄ ﬅ ﬆ) is refused. The rule is derived (`fitsOneSquare`) and a test pins the fourteen it finds among the Latin letters of the basic plane.

**Words are compared in the board's form.** The board form of a word is its `gridLettersOf` form, decomposed (NFD) and stripped of combining marks. `checkGuess` answers a word when the board forms are equal, and the validator calls two words duplicates when their board forms are equal. So "cafe", "CAFÉ" and "café" answer _café_, "café" and "Cafe" are one word twice, and "kapi" answers _kapı_ (ı is drawn I, ſ is drawn S). A letter with no accent-free form of the same length is compared as itself: ẞ, Æ, Ø, Œ, Ł, Đ, Þ. So _straße_ is answered by "straße" and not by "strasse", and _łódź_ is not answered by "lodz".

**Two words cross only where their squares hold the same letter**, accents included. The generator shows the library the grid's letters and not the words, so _café_ and _épée_ may cross at É and _bébé_ and _see_ may not cross É with E.

**Three error kinds, and the first that applies wins**, one word at a time: `word-has-digit`, then `word-not-latin` (a letter outside the alphabet), then `word-has-symbol` (any other character, the apostrophe, the hyphen, the refused letters and the ligatures included); then the existing length and duplicate kinds. The refused letters are checked before the ranges, so "ﬁne" is a symbol and not a foreign letter. There is no space error: spaces separate words. The sentences a player reads are in `FAULT_SENTENCES` (`apps/web/src/components/word-fault-sentences.ts`) and the strip counts the words it names by their board form.

**A typed letter is drawn upper case**, like every other letter on the board: é as É, ß as ẞ. The square's input has no `maxLength`; `letterTyped` composes what the input holds to NFC and takes the last letter of it. A keyboard that composes (a dead key) puts a bare accent in the input before the letter exists, and handing that up would clear the square and end the composition, so the square holds a composing value that is not yet a letter and hands it up only when it becomes one, or when the composition ends.

**The faces.** The latin-ext files of Alegreya Sans (400, 700 and 400 italic) are self-hosted, declared with `LATIN_EXT_RANGE` (the stock range less the seven code points it shares with the latin one) and never preloaded. They are counted against a second ceiling of 60.0 KiB gzipped, summed over those faces, by their range and not by their name ([0032](0032-what-the-first-visit-ceiling-measures.md), addendum of #232).

## Consequences

- **The guesser's card lower-cases the grid's spelling** (`answered-words.ts`), so a guessed _kapı_ reads "kapi" on the card: the guesser's view holds the board's letters and not the word. Only letters whose upper case is a different base letter lose by it (ı, ſ, ẛ). Accepted.
- **The board no longer tells ı from i.** A Turkish word with a dotless ı is drawn with an I, and a player may type ı or i. This follows from comparing words in the board's form and is the price of "a guess ignores accents".
- **ß is not ss.** A player who types an s into the fifth square of _straße_, where the board draws ẞ, is wrong, and "strasse" does not answer the word. That is deliberate and is what the test pins.
- **A word the face partly draws is drawn in two faces.** A letter in the ranges that Alegreya Sans lacks shows in a fallback face, and the letters around it do not change.
- **A page that draws a latin-ext letter fetches the latin-ext file of each weight and style it draws it in**, up to 46 KiB gzipped for all three. The landing page draws none and fetches none. The rule is checked in the workshop (`Screens/RoomGame` › `BoardDiacritics`).
- **Nothing changes in `firestore.rules`.** It limits `placedWords` to 20 and checks no letters.
- **The alphabets that are not here stay out.** Cyrillic and Greek need their own faces and their own decision on the budget; the validator refuses them by name, with `word-not-latin`.
