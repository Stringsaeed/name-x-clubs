import type { Level, Mode, Session } from '@nxc/game/model';
import { freeSession, practiceSession, restoreSession } from './restore';
import {
  type JsonStore,
  legacyPracticeKey,
  parseJson,
  parseSessionStorageKey,
  sessionStorageKey,
} from './storage';
import { migrateLegacyPractice, parseWireSession, toWireSession, type WireSession } from './wire';

export type SessionRepository = Readonly<{
  /** The session for `mode` and `level`: cached, restored from storage, or fresh. */
  load: (mode: Mode, level: Level) => Session;
  /** Writes `session` to storage and the cache. */
  save: (session: Session) => void;
  /**
   * Applies a value another tab wrote under `key`. Returns the session it now holds, or null when
   * the key is not a session key or the value does not restore; then nothing changes.
   */
  acceptExternal: (
    key: string,
    raw: string | null,
  ) => { mode: Mode; level: Level; session: Session } | null;
}>;

type RepositoryOptions = Readonly<{
  store: JsonStore;
  now: () => number;
  random: () => number;
}>;

function cacheKey(mode: Mode, level: Level) {
  return `${mode}:${level}`;
}

export function createSessionRepository({
  store,
  now,
  random,
}: RepositoryOptions): SessionRepository {
  const cache = new Map<string, Session>();

  function freshSession(mode: Mode, level: Level): Session {
    if (mode === 'free') {
      return freeSession(level);
    }

    return practiceSession(level, 'world', undefined, random);
  }

  function save(session: Session) {
    const mode = session.kind;
    const level = session.challenge.target;

    store.writeJson(sessionStorageKey(mode, level), toWireSession(session));
    cache.set(cacheKey(mode, level), session);
  }

  /** The stored v2 record, or a migrated v1 practice record when no v2 value exists. */
  function readRecord(mode: Mode, level: Level): { record: WireSession; migrated: boolean } | null {
    const current = store.readJson(sessionStorageKey(mode, level));

    if (current !== null || mode !== 'practice') {
      const record = parseWireSession(current);

      return record ? { record, migrated: false } : null;
    }

    const legacy = migrateLegacyPractice(store.readJson(legacyPracticeKey(level)), now());

    return legacy ? { record: legacy, migrated: true } : null;
  }

  /**
   * A record that fails to restore is left in storage. It is only replaced when the player acts on
   * the fresh session shown instead.
   */
  function readSession(mode: Mode, level: Level): Session {
    const saved = readRecord(mode, level);
    const restored = saved ? restoreSession(saved.record, { mode, level, now: now() }) : null;

    if (!saved || !restored) {
      return freshSession(mode, level);
    }

    if (saved.migrated || restored.repaired) {
      save(restored.session);
    }

    return restored.session;
  }

  function load(mode: Mode, level: Level): Session {
    const key = cacheKey(mode, level);
    const cached = cache.get(key);

    if (cached) {
      return cached;
    }

    const session = readSession(mode, level);
    cache.set(key, session);

    return session;
  }

  function acceptExternal(key: string, raw: string | null) {
    const target = parseSessionStorageKey(key);
    const record = parseWireSession(parseJson(raw));

    if (!target || !record) {
      return null;
    }

    const restored = restoreSession(record, { ...target, now: now() });

    if (!restored) {
      return null;
    }

    cache.set(cacheKey(target.mode, target.level), restored.session);

    return { ...target, session: restored.session };
  }

  return { load, save, acceptExternal };
}
