import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormHelperText from '@mui/material/FormHelperText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import {
  MAX_WORD_LENGTH,
  MAX_WORDS,
  MIN_WORD_LENGTH,
  MIN_WORDS,
  type WordListValidation,
} from 'shared';

import { isValidNickname, MAX_NICKNAME_LENGTH } from '../rooms/nickname';
import { Message } from './Message';

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
        <TextField
          label="Your nickname"
          value={nickname}
          onChange={(event) => onNicknameChange(event.target.value)}
          disabled={isCreating}
          slotProps={{ htmlInput: { maxLength: MAX_NICKNAME_LENGTH } }}
          helperText="Other players see you by this name. You play in your own room too."
          fullWidth
        />

        <Box>
          <TextField
            label="Words"
            value={rawWords}
            onChange={(event) => onWordsChange(event.target.value)}
            disabled={isCreating}
            error={showsErrors}
            multiline
            minRows={6}
            fullWidth
            placeholder={'apple, bread, cheese\ndinner, engine, flower'}
          />
          <FormHelperText>
            {`${MIN_WORDS}-${MAX_WORDS} English words, ${MIN_WORD_LENGTH}-${MAX_WORD_LENGTH} letters each, no repeats. Separate them with commas, spaces or new lines.`}
          </FormHelperText>
          <FormHelperText>{`${validation.words.length} words entered`}</FormHelperText>
        </Box>

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

        <Button type="submit" variant="contained" size="large" disabled={!canSubmit || isCreating}>
          {isCreating ? 'Creating the room...' : 'Create room'}
        </Button>
      </Stack>
    </Box>
  );
};
