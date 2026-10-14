import { z } from 'zod';
import { type ClubId, clubById, clubIdSchema } from '../content/catalog';
import { challengeLabel } from '../content/labels';
import { type AnswerEvent, challengesForLevel, eligibleClubs } from './engine';
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
  | { type: 'restart' }
  | { type: 'answer'; text: string }
  | { type: 'start' | 'finish' | 'tick' };
const wireRound = z.discriminatedUnion('phase', [
  z.object({ phase: z.literal('idle'), found: z.tuple([]) }),
  z.object({
    phase: z.literal('playing'),
    found: z.array(clubIdSchema).max(100),
    startedAt: z.number().finite().nonnegative(),
  }),
  z.object({
    phase: z.literal('complete'),
    found: z.array(clubIdSchema).max(100),
    elapsed: z.number().int().nonnegative(),
  }),
]);
const wireSession = z.object({
  version: z.literal(2),
  category: z.string().max(40),
  challengeId: z.string().max(40),
  round: wireRound,
});
const legacyPractice = z.object({
  version: z.literal(1),
  category: z.string().max(40),
  challengeId: z.string().max(40),
  round: z.object({
    phase: z.enum(['idle', 'playing', 'complete']),
    found: z.array(clubIdSchema).max(100),
  }),
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
  function storageKey(mode: Mode, level: Level) {
    return `nxc-v2-${mode}-${level}`;
  }
  function keyFor(mode: Mode, level: Level) {
    return `${mode}:${level}`;
  }
  function restore(session: Session, value: unknown): Session {
    const result = wireRound.safeParse(value);
    if (!result.success) return session;
    const saved = result.data;
    const eligible = new Set(eligibleClubs(session.challenge).map((c) => c.id));
    if (
      saved.found.length > session.challenge.target ||
      new Set(saved.found).size !== saved.found.length ||
      saved.found.some((id) => !clubById.has(id) || !eligible.has(id)) ||
      (saved.phase === 'playing' && saved.startedAt > now())
    )
      return session;
    if (saved.phase === 'playing' && saved.found.length === session.challenge.target)
      return {
        ...session,
        round: {
          phase: 'complete',
          found: saved.found,
          elapsed: Math.floor((now() - saved.startedAt) / 1000),
        },
      };
    return { ...session, round: saved };
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
    let session: Session =
      mode === 'free'
        ? {
            kind: 'free',
            challenge: challengesForLevel(level)[0],
            round: { phase: 'idle', found: [] },
          }
        : newPractice(level, 'world');
    let migrating = false;
    let saved: unknown = read(storageKey(mode, level));
    if (saved === null && mode === 'practice') {
      const legacy = legacyPractice.safeParse(read(`nxc-v1-practice-${level}`));
      if (legacy.success) {
        migrating = true;
        const old = legacy.data;
        saved = {
          ...old,
          version: 2,
          round:
            old.round.phase === 'playing'
              ? { ...old.round, startedAt: now() }
              : old.round.phase === 'complete'
                ? { ...old.round, elapsed: 0 }
                : old.round,
        };
      }
    }
    const result = wireSession.safeParse(saved);
    if (result.success) {
      const record = result.data;
      const challenge = challengesForLevel(level).find((c) => c.id === record.challengeId);
      if (challenge && (mode === 'practice' || challenge.scope.kind === 'world')) {
        session = restore(
          session.kind === 'practice'
            ? { ...session, challenge, category: record.category }
            : { ...session, challenge },
          record.round,
        );
      }
    }
    if (migrating) persist(session);
    sessions.set(key, session);
    return session;
  }
  const language = languageSchema.safeParse(read('nxc-language'));
  const level = levelSchema.safeParse(read('nxc-level'));
  const mode = modeSchema.safeParse(read('nxc-mode'));
  let view: GameView = {
    language: language.success ? language.data : 'en',
    level: level.success ? level.data : 10,
    mode: mode.success ? mode.data : 'free',
    session: load(mode.success ? mode.data : 'free', level.success ? level.data : 10),
    feedback: [],
    storageAvailable: available,
  };
  function persist(session: Session) {
    write(storageKey(session.kind, session.challenge.target), {
      version: 2,
      category: session.kind === 'practice' ? session.category : 'world',
      challengeId: session.challenge.id,
      round: session.round,
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
    if (intent.type === 'restart') {
      const session: Session =
        view.session.kind === 'practice'
          ? newPractice(view.level, view.session.category, view.session.challenge.id)
          : { ...view.session, round: { phase: 'idle', found: [] } };
      persist(session);
      publish({ ...view, session, feedback: [] });
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
    const external = (event: StorageEvent) => {
      const expected = storageKey(view.mode, view.level);
      if (event.key !== expected || !event.newValue) return;
      const incoming = load(view.mode, view.level, true);
      publish({ ...view, session: incoming, feedback: [] });
    };
    window.addEventListener('storage', external);
    return () => {
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
    const title = `name × clubs. ${session.kind === 'free' ? (view.language === 'en' ? 'Free time' : 'وقت حر') : view.language === 'en' ? 'Practice' : 'تدريب'}`;
    const elapsed = ` · ${formatElapsed(elapsedSeconds(session, now()))}`;
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
export function elapsedSeconds(session: Session, now: number) {
  return session.round.phase === 'complete'
    ? session.round.elapsed
    : session.round.phase === 'playing'
      ? Math.max(0, Math.floor((now - session.round.startedAt) / 1000))
      : 0;
}
export function formatElapsed(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
