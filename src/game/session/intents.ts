import type { AnswerEvent } from '../engine';
import type { Level, Mode, Session } from '../model';
import { type RoundAction, transition } from '../round';
import type { SessionRepository } from './repository';
import { practiceSession } from './restore';
import { type JsonStore, levelKey, modeKey } from './storage';

export type GameView = Readonly<{
  mode: Mode;
  level: Level;
  session: Session;
  feedback: readonly AnswerEvent[];
  storageAvailable: boolean;
}>;

export type Intent =
  | { type: 'mode'; mode: Mode }
  | { type: 'level'; level: Level }
  | { type: 'practice'; category: string }
  | { type: 'restart' }
  | { type: 'answer'; text: string }
  | { type: 'start' | 'finish' };

export type IntentContext = Readonly<{
  view: GameView;
  store: JsonStore;
  repository: SessionRepository;
  now: () => number;
  random: () => number;
}>;

export function sessionView(view: GameView, session: Session): GameView {
  return { ...view, session, feedback: [] };
}

/**
 * Every change is saved as it happens, so leaving a session does not write it again; that would
 * overwrite whatever another tab saved meanwhile.
 *
 * M7: elapsed time is derived from `startedAt`, so a round's clock keeps running while the
 * player is on another mode or level. Whether switching should pause it is an open product
 * decision; this is the current, tested behavior.
 */
function switchTo(context: IntentContext, mode: Mode, level: Level): GameView {
  context.store.writeJson(modeKey, mode);
  context.store.writeJson(levelKey, level);

  const session = context.repository.load(mode, level);

  return { ...context.view, mode, level, session, feedback: [] };
}

function choosePractice(context: IntentContext, category: string): GameView | null {
  const { view } = context;

  if (view.mode !== 'practice') {
    return null;
  }

  const session = practiceSession(view.level, category, view.session.challenge.id, context.random);
  context.repository.save(session);

  return sessionView(view, session);
}

function restart(context: IntentContext): GameView {
  const { view } = context;
  const current = view.session;
  let session: Session;

  if (current.kind === 'practice') {
    session = practiceSession(view.level, current.category, current.challenge.id, context.random);
  } else {
    session = { ...current, round: { phase: 'idle', found: [] } };
  }

  context.repository.save(session);

  return sessionView(view, session);
}

function play(context: IntentContext, action: RoundAction): GameView {
  const { view } = context;
  const result = transition(view.session, action);

  if (result.session !== view.session) {
    context.repository.save(result.session);
  }

  return { ...view, ...result };
}

/** The view after `intent`, or null when the intent does not apply. */
export function applyIntent(context: IntentContext, intent: Intent): GameView | null {
  switch (intent.type) {
    case 'mode': {
      return switchTo(context, intent.mode, context.view.level);
    }

    case 'level': {
      return switchTo(context, context.view.mode, intent.level);
    }

    case 'practice': {
      return choosePractice(context, intent.category);
    }

    case 'restart': {
      return restart(context);
    }

    case 'answer': {
      return play(context, { type: 'answer', text: intent.text, now: context.now() });
    }

    case 'start':
    case 'finish': {
      return play(context, { type: intent.type, now: context.now() });
    }
  }
}
