import type { ClubId } from '../content/catalog';
import type { Level } from '../model';
import type { AnswerEvent, ParsedAnswer } from './types';

/** Adds the newly named clubs to `found`, in order, until the round's target is reached. */
export function scoreAnswers(
  found: readonly ClubId[],
  results: readonly ParsedAnswer[],
  target: Level,
) {
  const next = [...found];
  const events: AnswerEvent[] = [];

  for (const result of results) {
    if (next.length >= target) {
      break;
    }

    if (result.kind !== 'match') {
      events.push(result);
      continue;
    }

    if (next.includes(result.club.id)) {
      events.push({ ...result, kind: 'duplicate' });
      continue;
    }

    next.push(result.club.id);
    events.push({ ...result, kind: 'accepted' });
  }

  return { found: next, events };
}
