import { normalize } from './normalize';
import { resolveClub, resolveExactly } from './resolve';
import { type ParsedAnswer, type ScopedChallenge, worldChallenge } from './types';

/** Commas, semicolons (Latin and Arabic) and new lines separate answers. */
const ANSWER_SEPARATORS = /[,،;؛\n]+/;

/** A bullet or list number in front of an answer: "- Arsenal", "• Arsenal", "1. Arsenal", "2) Arsenal". */
const LIST_MARKER = /^\s*(?:[-*•]|\p{N}+[.)-])\s*/u;

/** Words that join two names inside one answer: "Arsenal and Chelsea", "ارسنال و تشيلسي". */
const JOINING_WORDS: ReadonlySet<string> = new Set(['and', 'و']);

/** Answers beyond this are ignored, so a huge paste cannot freeze the page. */
export const MAX_ANSWERS_PER_SUBMIT = 300;

/** No club name in the catalog is longer than this many words. */
const LONGEST_NAME_WORDS = 6;

/** Splits submitted text into the separate answers it lists, dropping empty ones ("---", "🙂"). */
function splitAnswers(text: string) {
  const answers: string[] = [];

  for (const rawAnswer of text.split(ANSWER_SEPARATORS)) {
    const answer = rawAnswer.trim().replace(LIST_MARKER, '');

    if (normalize(answer) === '') {
      continue;
    }

    answers.push(answer);

    if (answers.length === MAX_ANSWERS_PER_SUBMIT) {
      break;
    }
  }

  return answers;
}

/** The longest run of words starting at `start` that names a club exactly. */
function clubNameAt(words: readonly string[], start: number, challenge: ScopedChallenge) {
  const longest = Math.min(LONGEST_NAME_WORDS, words.length - start);

  for (let length = longest; length > 0; length--) {
    const input = words.slice(start, start + length).join(' ');
    const resolution = resolveExactly(input, challenge);

    if (resolution.kind === 'match' || resolution.kind === 'wrong-category') {
      const answer: ParsedAnswer = { input, ...resolution };

      return { answer, length };
    }
  }

  return null;
}

/**
 * Reads an answer as several club names typed without commas, as a pasted list becomes in a
 * one-line field: "Arsenal Chelsea Liverpool". Every word must belong to a named club or be a
 * joining word. Otherwise the answer is one unknown name ("Arsenal de Sarandi"), and no part of
 * it is credited.
 */
function splitIntoClubNames(words: readonly string[], challenge: ScopedChallenge) {
  const answers: ParsedAnswer[] = [];
  let index = 0;

  while (index < words.length) {
    if (JOINING_WORDS.has(words[index] ?? '')) {
      index++;
      continue;
    }

    const next = clubNameAt(words, index, challenge);

    if (!next) {
      return null;
    }

    answers.push(next.answer);
    index += next.length;
  }

  return answers.length > 0 ? answers : null;
}

function parseAnswer(answer: string, challenge: ScopedChallenge): ParsedAnswer[] {
  const resolution = resolveClub(answer, challenge);

  if (resolution.kind !== 'unknown') {
    return [{ input: answer, ...resolution }];
  }

  const words = normalize(answer).split(' ');

  if (words.length > 1) {
    const listed = splitIntoClubNames(words, challenge);

    if (listed) {
      return listed;
    }
  }

  return [{ input: answer, kind: 'unknown' }];
}

/** Reads every club name in a submission, in the order they were typed. */
export function parseAnswers(
  text: string,
  challenge: ScopedChallenge = worldChallenge,
): ParsedAnswer[] {
  return splitAnswers(text).flatMap((answer) => parseAnswer(answer, challenge));
}
