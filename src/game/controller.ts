import { z } from 'zod';
import { type ClubId, clubById, clubIdSchema } from '../content/catalog';
import { challengeLabel } from '../content/labels';
import {
  type AnswerEvent,
  challengesForLevel,
  dailyChallenge,
  dailyStorageKey,
  dayKey,
  durationForTarget,
  eligibleClubs,
  remainingSeconds,
} from './engine';
import {
  type Language,
  type Level,
  languageSchema,
  levelSchema,
  type Mode,
  modeSchema,
  type Session,
} from './model';
import { type RoundAction, transition } from './round';

export type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
export type GameView = Readonly<{
  language: Language;
  mode: Mode;
  level: Level;
  session: Session;
  feedback: readonly AnswerEvent[];
  storageAvailable: boolean;
}>;
export type Intent =
  | { type: 'language'; language: Language }
  | { type: 'mode'; mode: Mode }
  | { type: 'level'; level: Level }
  | { type: 'practice'; category: string }
  | { type: 'answer'; text: string }
  | { type: 'start' | 'finish' | 'tick' };
const wireRound = z.object({
  phase: z.enum(['idle', 'playing', 'complete']),
  found: z.array(clubIdSchema).max(100),
  deadline: z.number().finite().nonnegative().nullable(),
  remaining: z.number().finite().nonnegative(),
});
const wirePractice = z.object({
  version: z.literal(1),
  category: z.string().max(40),
  challengeId: z.string().max(40),
  round: wireRound,
});
function browserStorage(): StoragePort | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
export function createGameController(
  options: { storage?: StoragePort | null; now?: () => number; random?: () => number } = {},
) {
  const storage = options.storage === undefined ? browserStorage() : options.storage;
  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;
  let available = storage !== null;
  const sessions = new Map<string, Session>();
  const listeners = new Set<() => void>();
  let browser: Window | null = null;
  function read(key: string): unknown {
    let value: string | null | undefined;
    try {
      value = storage?.getItem(key);
    } catch {
      available = false;
      return null;
    }
    try {
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }
  function write(key: string, value: unknown) {
    try {
      storage?.setItem(key, JSON.stringify(value));
    } catch {
      available = false;
    }
  }
  function practiceKey(level: Level) {
    return `nxc-v1-practice-${level}`;
  }
  function keyFor(mode: Mode, level: Level) {
    return mode === 'daily' ? `daily:${dayKey(new Date(now()))}:${level}` : `practice:${level}`;
  }
  function restore(session: Session, value: unknown): Session {
    const result = wireRound.safeParse(value);
    if (!result.success) return session;
    const saved = result.data;
    const eligible = new Set(eligibleClubs(session.challenge).map((c) => c.id));
    if (
      saved.found.length > session.challenge.target ||
      saved.remaining > durationForTarget(session.challenge.target) ||
      new Set(saved.found).size !== saved.found.length ||
      saved.found.some((id) => !clubById.has(id) || !eligible.has(id)) ||
      (saved.phase === 'idle' && saved.found.length !== 0)
    )
      return session;
    if (saved.phase === 'idle') return session;
    if (saved.phase === 'complete')
      return {
        ...session,
        round: { phase: 'complete', found: saved.found, remaining: saved.remaining },
      };
    if (saved.found.length === session.challenge.target)
      return {
        ...session,
        round: { phase: 'complete', found: saved.found, remaining: saved.remaining },
      };
    if (session.kind === 'practice')
      return { ...session, round: { phase: 'playing', found: saved.found } };
    if (saved.deadline === null) return session;
    return transition(
      { ...session, round: { phase: 'playing', found: saved.found, deadline: saved.deadline } },
      { type: 'tick', now: now() },
    ).session;
  }
  function newPractice(
    level: Level,
    category: string,
    previous?: string,
  ): Extract<Session, { kind: 'practice' }> {
    const pool = challengesForLevel(level);
    const alternatives = pool.filter((c) => c.id !== previous);
    const choice =
      category === 'random'
        ? (alternatives[Math.floor(random() * alternatives.length)] ?? pool[0])
        : (pool.find((c) => c.id === category) ?? pool[0]);
    return {
      kind: 'practice',
      category: category === 'random' ? 'random' : choice.id,
      challenge: choice,
      round: { phase: 'idle', found: [] },
    };
  }
  function load(mode: Mode, level: Level, force = false): Session {
    const key = keyFor(mode, level);
    const cached = sessions.get(key);
    if (cached && !force) return transition(cached, { type: 'tick', now: now() }).session;
    let session: Session;
    if (mode === 'daily') {
      const daily = dailyChallenge(new Date(now()), level);
      session = {
        kind: 'daily',
        day: daily.key,
        number: daily.number,
        challenge: daily.challenge,
        round: { phase: 'idle', found: [] },
      };
      session = restore(session, read(dailyStorageKey(session)));
    } else {
      session = newPractice(level, 'world');
      const result = wirePractice.safeParse(read(practiceKey(level)));
      if (result.success) {
        const challenge = challengesForLevel(level).find((c) => c.id === result.data.challengeId);
        if (challenge)
          session = restore(
            { ...session, challenge, category: result.data.category },
            result.data.round,
          );
      }
    }
    sessions.set(key, session);
    return session;
  }
  const language = languageSchema.safeParse(read('nxc-language'));
  const level = levelSchema.safeParse(read('nxc-level'));
  const mode = modeSchema.safeParse(read('nxc-mode'));
  let view: GameView = {
    language: language.success ? language.data : 'en',
    level: level.success ? level.data : 10,
    mode: mode.success ? mode.data : 'daily',
    session: load(mode.success ? mode.data : 'daily', level.success ? level.data : 10),
    feedback: [],
    storageAvailable: available,
  };
  function persist(session: Session) {
    const round = {
      phase: session.round.phase,
      found: session.round.found,
      remaining:
        session.round.phase === 'complete'
          ? session.round.remaining
          : durationForTarget(session.challenge.target),
      deadline:
        session.kind === 'daily' && session.round.phase === 'playing'
          ? session.round.deadline
          : null,
    };
    if (session.kind === 'daily') write(dailyStorageKey(session), round);
    else
      write(practiceKey(session.challenge.target), {
        version: 1,
        category: session.category,
        challengeId: session.challenge.id,
        round,
      });
    sessions.set(keyFor(session.kind, session.challenge.target), session);
  }
  function publish(next: GameView) {
    view = { ...next, storageAvailable: available };
    for (const listener of listeners) listener();
  }
  function dispatch(intent: Intent) {
    if (intent.type === 'language') {
      write('nxc-language', intent.language);
      publish({ ...view, language: intent.language, feedback: [] });
      return;
    }
    if (intent.type === 'mode' || intent.type === 'level') {
      persist(view.session);
      const mode = intent.type === 'mode' ? intent.mode : view.mode;
      const level = intent.type === 'level' ? intent.level : view.level;
      write('nxc-mode', mode);
      write('nxc-level', level);
      publish({ ...view, mode, level, session: load(mode, level), feedback: [] });
      return;
    }
    if (intent.type === 'practice') {
      if (view.mode !== 'practice') return;
      const session = newPractice(view.level, intent.category, view.session.challenge.id);
      persist(session);
      publish({ ...view, session, feedback: [] });
      return;
    }
    if (view.session.kind === 'daily' && view.session.day !== dayKey(new Date(now()))) {
      publish({ ...view, session: load('daily', view.level), feedback: [] });
      return;
    }
    const action: RoundAction =
      intent.type === 'answer'
        ? { type: 'answer', text: intent.text, now: now() }
        : { type: intent.type, now: now() };
    const result = transition(view.session, action);
    if (result.session === view.session && intent.type === 'tick') return;
    persist(result.session);
    publish({ ...view, ...result });
  }
  function connect(window: Window) {
    browser = window;
    const tick = () => dispatch({ type: 'tick' });
    const visible = () => {
      if (!window.document.hidden) tick();
    };
    const external = (event: StorageEvent) => {
      const expected =
        view.session.kind === 'daily' ? dailyStorageKey(view.session) : practiceKey(view.level);
      if (event.key !== expected || !event.newValue) return;
      const incoming = load(view.mode, view.level, true);
      publish({ ...view, session: incoming, feedback: [] });
    };
    const timer = window.setInterval(tick, 1000);
    window.document.addEventListener('visibilitychange', visible);
    window.addEventListener('storage', external);
    tick();
    return () => {
      window.clearInterval(timer);
      window.document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('storage', external);
      browser = null;
    };
  }
  async function shareResult(): Promise<
    { kind: 'shared' | 'copied' | 'cancelled' } | { kind: 'manual'; text: string }
  > {
    const session = view.session;
    const filled = Math.round((session.round.found.length / session.challenge.target) * 10);
    const squares = '🟩'.repeat(filled) + '⬜'.repeat(10 - filled);
    const title = `name × clubs. ${session.kind === 'daily' ? `#${String(session.number).padStart(3, '0')} · ${session.day}` : view.language === 'en' ? 'Practice' : 'تدريب'}`;
    const elapsed =
      session.kind === 'daily' &&
      session.round.phase === 'complete' &&
      session.round.found.length === session.challenge.target
        ? ` · ${durationForTarget(session.challenge.target) - session.round.remaining}s`
        : '';
    const text = `${title}\n${challengeLabel(session.challenge, view.language)}\n${squares} ${session.round.found.length}/${session.challenge.target}${elapsed}\n${browser?.location.origin ?? ''}`;
    try {
      if (browser?.navigator.share && browser.matchMedia('(pointer: coarse)').matches) {
        await browser.navigator.share({ title: 'Name × Clubs', text });
        return { kind: 'shared' };
      }
      if (!browser?.navigator.clipboard) return { kind: 'manual', text };
      await browser.navigator.clipboard.writeText(text);
      return { kind: 'copied' };
    } catch (error) {
      return error instanceof DOMException && error.name === 'AbortError'
        ? { kind: 'cancelled' }
        : { kind: 'manual', text };
    }
  }
  return {
    getSnapshot: () => view,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatch,
    connect,
    shareResult,
  };
}
export type GameController = ReturnType<typeof createGameController>;
export function namedClubs(found: readonly ClubId[]) {
  return found.flatMap((id) => {
    const club = clubById.get(id);
    return club ? [club] : [];
  });
}
export function timeRemaining(session: Session, now: number) {
  return session.round.phase === 'complete'
    ? session.round.remaining
    : session.kind === 'daily' && session.round.phase === 'playing'
      ? remainingSeconds(session.round.deadline, now)
      : durationForTarget(session.challenge.target);
}
