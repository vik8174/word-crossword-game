import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import {
  MAX_WORD_LENGTH,
  MAX_WORDS,
  MIN_WORD_LENGTH,
  MIN_WORDS,
  type WordListValidation,
} from 'shared';

import { isValidNickname, MAX_NICKNAME_LENGTH } from '../rooms/nickname';
import { Field, FieldHelp, FieldSet } from './Field';
import { Message } from './Message';
import { PillButton } from './PillButton';

/**
 * `id` of the nickname's own help line — wired to the nickname field's
 * `aria-describedby` by hand (issue #193's second trap: a `helperText` prop
 * used to wire this through MUI, and nothing does that without it).
 */
const NICKNAME_HELP_ID = 'nickname-help';

/**
 * A failure that has nothing to do with the word list itself: no crossword
 * could be built from it, or the room it would have started could not be
 * written.
 *
 * The two are not the same kind — the first is the owner's list to fix
 * (warning), the second is the room's own write failing (error) — so the kind
 * travels with the message rather than being assumed from where it is shown
 * (issue #185).
 */
export interface WordListFormNotice {
  readonly kind: 'warning' | 'error';
  readonly heading: string;
  readonly text: string;
}

interface WordListFormProps {
  readonly nickname: string;
  readonly onNicknameChange: (nickname: string) => void;
  readonly rawWords: string;
  readonly onWordsChange: (rawWords: string) => void;
  /** Validation of `rawWords`, recomputed by the parent on every keystroke. */
  readonly validation: WordListValidation;
  /** Failure that has nothing to do with the words themselves, e.g. a rejected write. */
  readonly notice?: WordListFormNotice;
  /** `true` while the room is being written — the form is frozen but stays readable. */
  readonly isCreating: boolean;
  readonly onSubmit: () => void;
}

/**
 * The room-creation form — a nickname and the list of words to play with.
 *
 * Validation runs while the owner types, but stays quiet until there is
 * something to judge: an untouched form shows the rules, not complaints. The
 * submit button unlocks only for a list the game can actually be built from.
 *
 * @param props.validation - Result of `validateWordList` for the current text
 * @param props.notice - Message about a failure outside the word list
 * @param props.onSubmit - Called only when nickname and word list are both valid
 */
export const WordListForm = ({
  nickname,
  onNicknameChange,
  rawWords,
  onWordsChange,
  validation,
  notice,
  isCreating,
  onSubmit,
}: WordListFormProps) => {
  const hasTypedWords = rawWords.trim().length > 0;
  const showsErrors = hasTypedWords && validation.errors.length > 0;
  const canSubmit = validation.isValid && isValidNickname(nickname);

  return (
    <Box
      component="form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      noValidate
    >
      <Stack spacing={5}>
        <FieldSet>
          <Field
            id="nickname"
            label="Your nickname"
            value={nickname}
            onChange={onNicknameChange}
            disabled={isCreating}
            maxLength={MAX_NICKNAME_LENGTH}
            describedBy={NICKNAME_HELP_ID}
          />
          <FieldHelp id={NICKNAME_HELP_ID}>
            Other players see you by this name. You play in your own room too.
          </FieldHelp>
        </FieldSet>

        <FieldSet>
          <Field
            id="words"
            label="Words"
            value={rawWords}
            onChange={onWordsChange}
            disabled={isCreating}
            invalid={showsErrors}
            multiline
            placeholder={'apple, bread, cheese\ndinner, engine, flower'}
          />
          <FieldHelp>
            {`${MIN_WORDS}-${MAX_WORDS} English words, ${MIN_WORD_LENGTH}-${MAX_WORD_LENGTH} letters each, no repeats. Separate them with commas, spaces or new lines.`}
          </FieldHelp>
          <FieldHelp>{`${validation.words.length} words entered`}</FieldHelp>
        </FieldSet>

        {showsErrors && (
          <Message
            kind="warning"
            heading="The list needs a change"
            items={validation.errors.map((error) => error.message)}
          >
            Fix these before the game can be built:
          </Message>
        )}

        {notice !== undefined && (
          <Message kind={notice.kind} heading={notice.heading}>
            {notice.text}
          </Message>
        )}

        <PillButton type="submit" loading={isCreating} disabled={!canSubmit}>
          {isCreating ? 'Creating the room...' : 'Create room'}
        </PillButton>
      </Stack>
    </Box>
  );
};
