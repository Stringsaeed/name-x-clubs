import { type AnswerEvent, parseAnswers, scoreAnswers } from './engine';
import type { Session } from './model';

export type RoundAction = (
  | { type: 'start' }
  | { type: 'finish' }
  | { type: 'tick' }
  | { type: 'answer'; text: string }
) & { now: number };
export function transition(
  session: Session,
  action: RoundAction,
): { session: Session; feedback: readonly AnswerEvent[] } {
  const unchanged = { session, feedback: [] };
  if (session.round.phase === 'complete') {
    return unchanged;
  }
  if (action.type === 'start') {
    if (session.round.phase !== 'idle') {
      return unchanged;
    }
    return {
      session: { ...session, round: { phase: 'playing', found: [], startedAt: action.now } },
      feedback: [],
    };
  }
  if (session.round.phase !== 'playing') {
    return unchanged;
  }
  const elapsed = Math.max(0, Math.floor((action.now - session.round.startedAt) / 1000));
  if (action.type === 'finish') {
    return {
      session: { ...session, round: { phase: 'complete', found: session.round.found, elapsed } },
      feedback: [],
    };
  }
  if (action.type === 'tick') {
    return unchanged;
  }
  const scored = scoreAnswers(
    session.round.found,
    parseAnswers(action.text, session.challenge),
    session.challenge.target,
  );
  if (scored.found.length === session.challenge.target) {
    return {
      session: { ...session, round: { phase: 'complete', found: scored.found, elapsed } },
      feedback: [],
    };
  }
  const next: Session = {
    ...session,
    round: { phase: 'playing', found: scored.found, startedAt: session.round.startedAt },
  };
  return {
    session: next,
    feedback: [
      ...new Map(
        scored.events
          .filter((event) => event.kind !== 'accepted')
          .map((event): [string, AnswerEvent] => [`${event.kind}:${event.input}`, event]),
      ).values(),
    ].slice(-3),
  };
}
