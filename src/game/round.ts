import {
  type AnswerEvent,
  durationForTarget,
  parseAnswers,
  remainingSeconds,
  scoreAnswers,
} from './engine';
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
  if (session.round.phase === 'complete') return unchanged;
  if (action.type === 'start') {
    if (session.round.phase !== 'idle') return unchanged;
    return {
      session:
        session.kind === 'daily'
          ? {
              ...session,
              round: {
                phase: 'playing',
                found: [],
                deadline: action.now + durationForTarget(session.challenge.target) * 1000,
              },
            }
          : { ...session, round: { phase: 'playing', found: [] } },
      feedback: [],
    };
  }
  if (session.round.phase !== 'playing') return unchanged;
  const remaining =
    session.kind === 'daily' && session.round.phase === 'playing'
      ? remainingSeconds(session.round.deadline, action.now)
      : durationForTarget(session.challenge.target);
  if (remaining === 0 || action.type === 'finish')
    return {
      session: { ...session, round: { phase: 'complete', found: session.round.found, remaining } },
      feedback: [],
    };
  if (action.type === 'tick') return unchanged;
  const scored = scoreAnswers(
    session.round.found,
    parseAnswers(action.text, session.challenge),
    session.challenge.target,
  );
  if (scored.found.length === session.challenge.target)
    return {
      session: { ...session, round: { phase: 'complete', found: scored.found, remaining } },
      feedback: [],
    };
  const next: Session =
    session.kind === 'daily'
      ? {
          ...session,
          round: { phase: 'playing', found: scored.found, deadline: session.round.deadline },
        }
      : { ...session, round: { phase: 'playing', found: scored.found } };
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
