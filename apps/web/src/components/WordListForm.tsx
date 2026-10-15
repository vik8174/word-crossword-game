import Box from '@mui/material/Box';
import { useMemo, useState } from 'react';
import {
  MAX_WORD_LENGTH,
  MAX_WORDS,
  MIN_WORD_LENGTH,
  MIN_WORDS,
  validateWordList,
  type WordListValidation,
} from 'shared';

import { isValidNickname, MAX_NICKNAME_LENGTH } from '../rooms/nickname';
import type { RoomMode } from '../rooms/room-document';
import { Field } from './Field';
import { gateButtonRowSx, gateHintSx, gateStackSx } from './gate-panel-styles';
import { BLOCKS_PROPS } from './screen-blocks';
import { Message } from './Message';
import { PillButton } from './PillButton';
import {
  CHANGE_LIST_SENTENCE,
  changeSentence,
  countSentence,
  NICKNAME_SENTENCE,
  NO_CROSSING_SENTENCE,
  sentenceFor,
  wordFaults,
} from './word-fault-sentences';

/** The line under the nickname: who sees it, and that its owner plays too. */
const NICKNAME_HELP: Readonly<Record<RoomMode, string>> = {
  pair: 'The other player sees you by this name. You play in your own room too.',
  lesson:
    'Your players see you by this name. In a lesson you do not play: you deal the words and watch.',
};

/** The end of a text that has a word still being typed: the last word, with no separator after it. */
const UNFINISHED_WORD = /[^\s,]+$/;

/**
 * The line under the words: the rules, and how many words are entered.
 *
 * It never changes into a complaint: a wrong list is said inside the field
 * (issue #225), so this line keeps counting.
 *
 * @param count - How many words are in the box
 */
const wordsHelp = (count: number): string =>
  `${MIN_WORDS} to ${MAX_WORDS} words, ${MIN_WORD_LENGTH} to ${MAX_WORD_LENGTH} letters each, no repeats. ${count} ${count === 1 ? 'word' : 'words'} entered.`;

interface WordListFormProps {
  /** What the room is for; `pair` unless given. It decides what the line under the nickname says. */
  readonly mode?: RoomMode;
  readonly nickname: string;
  readonly onNicknameChange: (nickname: string) => void;
  readonly rawWords: string;
  readonly onWordsChange: (rawWords: string) => void;
  /** Validation of `rawWords`, recomputed by the parent on every keystroke. */
  readonly validation: WordListValidation;
  /**
   * The generator found no crossing at all in a list the validator accepts.
   * Said inside the field, like any other fault of the list.
   */
  readonly noCrossing?: boolean;
  /** The write was refused. A failure of the wire, so a card: no field owns it. */
  readonly writeFailed?: boolean;
  /** `true` while the room is being written — the form is frozen but stays readable. */
  readonly isCreating: boolean;
  readonly onSubmit: () => void;
}

/**
 * The room-creation form — a nickname and the list of words to play with
 * (`design/templates/state-tree.html`, `?state=create` and its variants).
 *
 * A wrong list is said inside the words field, in a strip under the words it is
 * about (Viktor's choice, 2026-10-14). Only faults about a word go there, and a
 * word is judged once it is finished: when a separator follows it or the field
 * loses focus, never while it is being typed. A fault about the count never
 * goes in the strip; while the button is disabled, the reason stands beside it.
 *
 * @param props.mode - What the room is for, which words the help under the nickname
 * @param props.validation - Result of `validateWordList` for the current text
 * @param props.noCrossing - No crossword can be built from the list
 * @param props.writeFailed - Shows the card for a refused write
 * @param props.onSubmit - Called only when nickname and word list are both valid
 */
export const WordListForm = ({
  mode = 'pair',
  nickname,
  onNicknameChange,
  rawWords,
  onWordsChange,
  validation,
  noCrossing = false,
  writeFailed = false,
  isCreating,
  onSubmit,
}: WordListFormProps) => {
  const [wordsFocused, setWordsFocused] = useState(false);

  const judgedText =
    wordsFocused && UNFINISHED_WORD.test(rawWords)
      ? rawWords.replace(UNFINISHED_WORD, '')
      : rawWords;
  const judgedFaults = useMemo(() => wordFaults(validateWordList(judgedText).errors), [judgedText]);
  const faults = [...judgedFaults.map(sentenceFor), ...(noCrossing ? [NO_CROSSING_SENTENCE] : [])];

  const canSubmit = validation.isValid && isValidNickname(nickname) && !noCrossing;

  /** Why the button is disabled, in the order the reader would fix it; nothing once it can be pressed. */
  const reason = (): string | null => {
    if (isCreating || canSubmit) {
      return null;
    }

    if (judgedFaults.length > 0) {
      return changeSentence(judgedFaults);
    }

    if (noCrossing) {
      return CHANGE_LIST_SENTENCE;
    }

    return (
      countSentence(validation.errors) ?? (isValidNickname(nickname) ? null : NICKNAME_SENTENCE)
    );
  };
  const hint = reason();

  return (
    <Box
      {...BLOCKS_PROPS}
      component="form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      noValidate
      sx={gateStackSx}
    >
      <Field
        id="nickname"
        label="Your nickname"
        value={nickname}
        onChange={onNicknameChange}
        disabled={isCreating}
        maxLength={MAX_NICKNAME_LENGTH}
        help={NICKNAME_HELP[mode]}
      />

      <Field
        id="words"
        label="Words"
        value={rawWords}
        onChange={onWordsChange}
        onFocusChange={setWordsFocused}
        disabled={isCreating}
        faults={faults}
        multiline
        placeholder={'apple, bread, cheese\ndinner, engine, flower'}
        help={wordsHelp(validation.words.length)}
      />

      {writeFailed && (
        <Message kind="error" heading="The room could not be created">
          Check your connection and try again.
        </Message>
      )}

      <Box sx={gateButtonRowSx}>
        <PillButton type="submit" loading={isCreating} disabled={!canSubmit}>
          {isCreating ? 'Creating the room' : 'Create room'}
        </PillButton>
        {hint !== null && (
          <Box component="span" sx={gateHintSx}>
            {hint}
          </Box>
        )}
      </Box>
    </Box>
  );
};
