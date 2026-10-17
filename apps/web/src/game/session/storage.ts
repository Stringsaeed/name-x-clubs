import { type Level, levelSchema, type Mode, modeSchema } from '@nxc/game/model';

export type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;

export type JsonStore = Readonly<{
  /** Raw string at `key`, or null when missing or unreadable. */
  readRaw: (key: string) => string | null;
  /** Parsed JSON at `key`, or null when missing, unreadable or not JSON. */
  readJson: (key: string) => unknown;
  writeJson: (key: string, value: unknown) => void;
  /** False once any read or write has thrown (private mode, quota, blocked storage). */
  isAvailable: () => boolean;
}>;

const sessionKeyPrefix = 'nxc-v2-';

export const modeKey = 'nxc-mode';

export const levelKey = 'nxc-level';

export function sessionStorageKey(mode: Mode, level: Level) {
  return `${sessionKeyPrefix}${mode}-${level}`;
}

export function legacyPracticeKey(level: Level) {
  return `nxc-v1-practice-${level}`;
}

/** Reverses `sessionStorageKey`; returns null for any key that is not a current session key. */
export function parseSessionStorageKey(key: string): { mode: Mode; level: Level } | null {
  if (!key.startsWith(sessionKeyPrefix)) {
    return null;
  }

  const [rawMode, rawLevel, ...rest] = key.slice(sessionKeyPrefix.length).split('-');

  if (rest.length > 0) {
    return null;
  }

  const mode = modeSchema.safeParse(rawMode);
  const level = levelSchema.safeParse(Number(rawLevel));

  if (!mode.success || !level.success) {
    return null;
  }

  return { mode: mode.data, level: level.data };
}

export function parseJson(raw: string | null): unknown {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function browserStorage(): StoragePort | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createJsonStore(port: StoragePort | null): JsonStore {
  let available = port !== null;

  function readRaw(key: string): string | null {
    try {
      return port?.getItem(key) ?? null;
    } catch {
      available = false;
      return null;
    }
  }

  function writeJson(key: string, value: unknown) {
    try {
      port?.setItem(key, JSON.stringify(value));
    } catch {
      available = false;
    }
  }

  return {
    readRaw,
    readJson: (key) => parseJson(readRaw(key)),
    writeJson,
    isAvailable: () => available,
  };
}
