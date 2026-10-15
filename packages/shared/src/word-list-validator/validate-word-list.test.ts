import { describe, expect, it } from 'vitest';

import { validateWordList } from './validate-word-list';
import type { WordListErrorCode } from './types';

const TEN_VALID = 'apple, bread, cheese, dinner, engine, flower, garden, hunter, island, jacket';

const TWENTY_VALID = `${TEN_VALID}, kitchen, ladder, monkey, needle, orange, pencil, rabbit, silver, temple, window`;

/** Replaces one word of an otherwise valid ten-word list, keeping the count at ten. */
const tenWordsWith = (word: string): string => TEN_VALID.replace('apple', word);

const codesOf = (text: string): WordListErrorCode[] =>
  validateWordList(text).errors.map((error) => error.code);

describe('validateWordList', () => {
  describe('parsing', () => {
    it('splits words on commas', () => {
      expect(validateWordList('apple,bread,cheese').words).toEqual(['apple', 'bread', 'cheese']);
    });

    it('splits words on newlines', () => {
      expect(validateWordList('apple\nbread\ncheese').words).toEqual(['apple', 'bread', 'cheese']);
    });

    it('accepts commas, newlines and spaces mixed in one list', () => {
      expect(validateWordList('apple, bread\ncheese  dinner').words).toEqual([
        'apple',
        'bread',
        'cheese',
        'dinner',
      ]);
    });

    it('ignores blank lines, stray separators and surrounding whitespace', () => {
      expect(validateWordList('  apple ,,\n\n  bread,\n').words).toEqual(['apple', 'bread']);
    });

    it('keeps each word in the letter case the owner typed', () => {
      expect(validateWordList('Apple, BREAD').words).toEqual(['Apple', 'BREAD']);
    });

    it('returns no words for text that holds none', () => {
      expect(validateWordList('   \n , \n ').words).toEqual([]);
    });
  });

  describe('a list the game accepts', () => {
    it('reports ten valid words as valid, with no errors', () => {
      const result = validateWordList(TEN_VALID);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('reports twenty valid words as valid', () => {
      expect(validateWordList(TWENTY_VALID).isValid).toBe(true);
    });

    it('accepts words at both length boundaries', () => {
      expect(validateWordList(tenWordsWith('cat')).isValid).toBe(true);
      expect(validateWordList(tenWordsWith('responsibilities')).isValid).toBe(true);
    });
  });

  describe('word count', () => {
    it('rejects fewer than ten words', () => {
      expect(codesOf('apple, bread, cheese')).toContain('too-few-words');
    });

    it('rejects more than twenty words', () => {
      expect(codesOf(`${TWENTY_VALID}, yellow`)).toContain('too-many-words');
    });

    it('rejects empty text as too few words rather than as valid', () => {
      const result = validateWordList('');

      expect(result.isValid).toBe(false);
      expect(result.errors.map((error) => error.code)).toEqual(['too-few-words']);
    });
  });

  describe('individual words', () => {
    it('rejects a word shorter than three letters', () => {
      expect(codesOf(tenWordsWith('ox'))).toContain('word-too-short');
    });

    it('rejects a word longer than sixteen letters', () => {
      expect(codesOf(tenWordsWith('misunderstandings'))).toContain('word-too-long');
    });

    it('rejects a word written outside the Latin alphabet', () => {
      expect(codesOf(tenWordsWith('яблуко'))).toEqual(['word-not-latin']);
    });

    it('rejects a word carrying digits, hyphens or apostrophes, each as what it is', () => {
      expect(codesOf(tenWordsWith('e-mail'))).toEqual(['word-has-symbol']);
      expect(codesOf(tenWordsWith("don't"))).toEqual(['word-has-symbol']);
      expect(codesOf(tenWordsWith('room101'))).toEqual(['word-has-digit']);
    });

    it('names the offending word in the error, so the owner can find it', () => {
      const [error] = validateWordList(tenWordsWith('ox')).errors;

      expect(error.word).toBe('ox');
      expect(error.message).toContain('ox');
    });

    it('reports every offending word, not only the first', () => {
      const result = validateWordList('ox, yak, яблуко, misunderstandings');
      const offenders = result.errors.filter((error) => error.word !== undefined);

      expect(offenders.map((error) => error.word)).toEqual(['ox', 'яблуко', 'misunderstandings']);
    });
  });

  describe('duplicates', () => {
    it('rejects a word listed twice', () => {
      expect(codesOf(`${TEN_VALID}, apple`)).toContain('duplicate-word');
    });

    it('treats words differing only in letter case as duplicates', () => {
      expect(codesOf(`${TEN_VALID}, APPLE`)).toContain('duplicate-word');
    });

    it('reports a word repeated many times only once', () => {
      const duplicates = validateWordList(`${TEN_VALID}, apple, apple, apple`).errors.filter(
        (error) => error.code === 'duplicate-word',
      );

      expect(duplicates).toHaveLength(1);
    });
  });

  it('reports a count problem and a word problem together', () => {
    expect(codesOf('ox, yak')).toEqual(expect.arrayContaining(['too-few-words', 'word-too-short']));
  });
});

/** The error codes of a list of ten in which `word` replaces `apple`. */
const faultOf = (word: string) => validateWordList(tenWordsWith(word)).errors[0];

describe('a word in any Latin alphabet', () => {
  describe('what is accepted', () => {
    it.each(['café', 'ñandú', 'łódź', 'ősz', 'straße', 'kapı', 'çay', 'Ærø', 'Đàn', 'ışık'])(
      'accepts %s',
      (word) => {
        expect(validateWordList(tenWordsWith(word)).errors).toEqual([]);
      },
    );

    it('accepts a letter of each range and one the face does not draw, from fixed letters', () => {
      // Written out, not built from the range constants: the test must stand
      // outside the ranges it checks. ñ ő ł ę ş ı ß are drawn; Ɐ (U+2C6F) lies
      // in latin-ext and is not in Alegreya Sans, and is accepted all the same.
      for (const letter of ['ñ', 'ő', 'ł', 'ę', 'ş', 'ı', 'ß', 'Ɐ']) {
        expect(validateWordList(tenWordsWith(`ab${letter}`)).errors, letter).toEqual([]);
      }
    });

    it('returns the words composed to NFC, whatever way an accent was typed', () => {
      const decomposed = 'cafe\u0301';
      const result = validateWordList(tenWordsWith(decomposed));

      expect(result.words[0]).toBe('café');
      expect(result.words[0]).toBe('caf\u00E9');
      expect(result.errors).toEqual([]);
    });

    it('counts a decomposed café and a precomposed one as the same word of 4 letters', () => {
      const result = validateWordList(`${tenWordsWith('cafe\u0301')}, caf\u00E9`);

      expect(result.errors.map((error) => error.code)).toEqual(['duplicate-word']);
      expect(codesOf(tenWordsWith('cafe\u0301'))).toEqual([]);
    });

    it('counts length in letters after NFC', () => {
      // straße is 6 letters and ñandú is 5 where UTF-16 or UTF-8 counting would say more.
      expect(codesOf(tenWordsWith('ñandú'))).toEqual([]);
      expect(codesOf(tenWordsWith('ñé'))).toEqual(['word-too-short']);
      expect(codesOf(tenWordsWith('straße'))).toEqual([]);
      // sixteen letters, every one of them accented
      expect(codesOf(tenWordsWith('éééééééééééééééé'))).toEqual([]);
      expect(codesOf(tenWordsWith('ééééééééééééééééé'))).toEqual(['word-too-long']);
    });

    it('counts the letters of a decomposed word, not its marks', () => {
      expect(codesOf(tenWordsWith('e\u0301e\u0301e\u0301'))).toEqual([]);
      expect(codesOf(tenWordsWith('e\u0301e\u0301'))).toEqual(['word-too-short']);
    });
  });

  describe('what is refused, and as what', () => {
    it.each([
      ["rock'n'roll2", 'word-has-digit'],
      ['кафе', 'word-not-latin'],
      ["rock'n'roll", 'word-has-symbol'],
      ['caf!', 'word-has-symbol'],
      ['ﬁne', 'word-has-symbol'],
    ] as const)('gives %s the error %s', (word, code) => {
      expect(faultOf(word)?.code).toBe(code);
      expect(validateWordList(tenWordsWith(word)).errors).toHaveLength(1);
    });

    it('answers the first rule that applies: a digit, then another alphabet, then any character', () => {
      expect(faultOf('кафе2')?.code).toBe('word-has-digit');
      expect(faultOf('кафе!')?.code).toBe('word-not-latin');
      expect(faultOf('caf!2')?.code).toBe('word-has-digit');
      expect(faultOf('ﬁк')?.code).toBe('word-not-latin');
    });

    it('answers a fault of the characters before one of the length', () => {
      expect(faultOf('а')?.code).toBe('word-not-latin');
      expect(faultOf('ab!')?.code).toBe('word-has-symbol');
      expect(faultOf('a!')?.code).toBe('word-has-symbol');
      expect(faultOf('a1')?.code).toBe('word-has-digit');
    });

    it('refuses the letters that cannot fill one square, with the symbol error, before the ranges', () => {
      for (const letter of ['ŉ', 'ǰ', 'ẖ', 'ẗ', 'ẘ', 'ẙ', 'ẚ']) {
        expect(faultOf(`ab${letter}`)?.code, letter).toBe('word-has-symbol');
      }

      for (const ligature of [
        '\uFB00',
        '\uFB01',
        '\uFB02',
        '\uFB03',
        '\uFB04',
        '\uFB05',
        '\uFB06',
      ]) {
        expect(faultOf(`ab${ligature}`)?.code, ligature).toBe('word-has-symbol');
      }
    });

    it('refuses what lies outside the two ranges, tested from outside them', () => {
      // Ở (U+1EDE) is Vietnamese and in neither range; Ａ (U+FF21) is fullwidth;
      // 𝐀 (U+1D400) is astral; к is Cyrillic.
      for (const letter of ['Ở', 'Ａ', '𝐀', 'к']) {
        expect(faultOf(`ab${letter}`)?.code, letter).toBe('word-not-latin');
      }
    });

    it('refuses a letter inside the ranges that is not of Latin script, as the rule says', () => {
      // The alphabet is two conditions: a Latin letter, and inside the ranges.
      // Each of these lies inside them (a range is a list of code points, and
      // says nothing of script) and is not Latin: µ (U+00B5) is the micro sign,
      // ʻ (U+02BB) the Hawaiian okina, ᴦ (U+1D26) a Greek small capital gamma,
      // ᴫ (U+1D2B) a Cyrillic small capital el, ℓ (U+2113) the script small l.
      // The range check alone accepts every one.
      for (const letter of ['µ', 'ʻ', 'ʼ', 'ˆ', 'ᴦ', 'ᴫ', 'ℓ']) {
        expect(faultOf(`ab${letter}`)?.code, letter).toBe('word-not-latin');
      }
    });

    it('accepts the part of the Vietnamese block that latin-ext holds, and refuses the rest', () => {
      expect(faultOf('abẳ')?.code).toBe('word-not-latin');
      expect(faultOf('abỳ')).toBeUndefined();
      expect(faultOf('abỹ')).toBeUndefined();
    });

    it('does not take a combining mark that has no letter to join for a letter', () => {
      // q̃ has no precomposed form: NFC leaves q and a tilde, and the tilde is not a letter.
      expect(faultOf('abq\u0303')?.code).toBe('word-has-symbol');
    });

    it('sends the validator message as the sentence of the issue, curly quotes included', () => {
      expect(faultOf('ab2')?.message).toBe('“ab2” has a digit in it. Use letters only.');
      expect(faultOf('abк')?.message).toBe('“abк” is not written in Latin letters.');
      expect(faultOf('ab!')?.message).toBe('“ab!” has a character that is not a letter.');
    });

    it('has no error for a space: spaces separate words', () => {
      const result = validateWordList('ice cream, apple');

      expect(result.words).toEqual(['ice', 'cream', 'apple']);
      expect(result.errors.map((error) => error.code)).toEqual(['too-few-words']);
    });
  });

  describe('duplicates', () => {
    it('finds café and Cafe to be one word twice, with or without the accent', () => {
      const nine = 'apple, bread, cheese, dinner, engine, flower, garden, hunter, island';

      expect(codesOf(`${nine}, café, Cafe`)).toEqual(['duplicate-word']);
      expect(codesOf(`${nine}, CAFÉ, café`)).toEqual(['duplicate-word']);
    });

    it('finds kapı and kapi to be one word, as the board draws ı as I', () => {
      const nine = 'apple, bread, cheese, dinner, engine, flower, garden, hunter, island';

      expect(codesOf(`${nine}, kapı, kapi`)).toEqual(['duplicate-word']);
    });

    it('keeps straße and strasse as two words, since ẞ is not SS', () => {
      const eight = 'apple, bread, cheese, dinner, engine, flower, garden, hunter';

      expect(codesOf(`${eight}, island, straße, strasse`)).toEqual([]);
    });

    it('names the second spelling in the error, once however often it comes back', () => {
      const nine = 'apple, bread, cheese, dinner, engine, flower, garden, hunter, island';
      const errors = validateWordList(`${nine}, café, Cafe, cafè`).errors;

      expect(errors).toHaveLength(1);
      expect(errors[0]?.word).toBe('Cafe');
    });
  });
});
