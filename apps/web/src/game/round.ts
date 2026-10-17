import { type AnswerEvent, parseAnswers, scoreAnswers } from '@nxc/game/engine';
import { type PlayingRound, type Round, type Session, secondsBetween } from '@nxc/game/model';

export type RoundAction = (
  | { type: 'start' }
  | { type: 'finish' }
  | { type: 'answer'; text: string }
) & { now: number };

export type Transition = { session: Session; feedback: readonly AnswerEvent[] };

const maxFeedback = 3;

function withoutFeedback(session: Session): Transition {
  return { session, feedback: [] };
}

function withRound(session: Session, round: Round): Session {
  return { ...session, round };
}

/** Keeps the latest problem per kind and input, so a repeated typo is reported once. */
function uniqueProblems(events: readonly AnswerEvent[]): AnswerEvent[] {
  const byKindAndInput = new Map<string, AnswerEvent>();

  for (const event of events) {
    if (event.kind !== 'accepted') {
      byKindAndInput.set(`${event.kind}:${event.input}`, event);
    }
  }

  return [...byKindAndInput.values()].slice(-maxFeedback);
}

function start(session: Session, now: number): Transition {
  if (session.round.phase !== 'idle') {
    return withoutFeedback(session);
  }

  return withoutFeedback(withRound(session, { phase: 'playing', found: [], startedAt: now }));
}

function finish(session: Session, round: PlayingRound, now: number): Transition {
  const elapsed = secondsBetween(round.startedAt, now);

  return withoutFeedback(withRound(session, { phase: 'complete', found: round.found, elapsed }));
}

function answer(session: Session, round: PlayingRound, text: string, now: number): Transition {
  const target = session.challenge.target;
  const scored = scoreAnswers(round.found, parseAnswers(text, session.challenge), target);

  if (scored.found.length === target) {
    const elapsed = secondsBetween(round.startedAt, now);

    return withoutFeedback(withRound(session, { phase: 'complete', found: scored.found, elapsed }));
  }

  return {
    session: withRound(session, { ...round, found: scored.found }),
    feedback: uniqueProblems(scored.events),
  };
}

export function transition(session: Session, action: RoundAction): Transition {
  if (action.type === 'start') {
    return start(session, action.now);
  }

  const round = session.round;

  if (round.phase !== 'playing') {
    return withoutFeedback(session);
  }

  if (action.type === 'finish') {
    return finish(session, round, action.now);
  }

  return answer(session, round, action.text, action.now);
}
