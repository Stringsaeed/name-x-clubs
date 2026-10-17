import { type ClubId, clubById } from '@nxc/game/content/catalog';
import {
  type Language,
  type Level,
  levelSchema,
  type Mode,
  modeSchema,
  type Session,
  secondsBetween,
} from '@nxc/game/model';
import { applyIntent, type GameView, type Intent, sessionView } from './session/intents';
import { createSessionRepository, type SessionRepository } from './session/repository';
import { buildShareText, deliverShare, type ShareOutcome } from './session/share';
import {
  browserStorage,
  createJsonStore,
  type JsonStore,
  levelKey,
  modeKey,
  type StoragePort,
} from './session/storage';

export type { GameView, Intent, StoragePort };

export type GameControllerOptions = {
  /** Defaults to `window.localStorage`; pass null to play without saving. */
  storage?: StoragePort | null;
  now?: () => number;
  random?: () => number;
};

const defaultLevel: Level = 10;

const defaultMode: Mode = 'free';

function initialView(store: JsonStore, repository: SessionRepository): GameView {
  const savedLevel = levelSchema.safeParse(store.readJson(levelKey));
  const savedMode = modeSchema.safeParse(store.readJson(modeKey));
  const level = savedLevel.success ? savedLevel.data : defaultLevel;
  const mode = savedMode.success ? savedMode.data : defaultMode;

  return {
    mode,
    level,
    session: repository.load(mode, level),
    feedback: [],
    storageAvailable: store.isAvailable(),
  };
}

/** Wires storage, saved sessions, intents, cross-tab updates and sharing behind one store API. */
export function createGameController(options: GameControllerOptions = {}) {
  const port = options.storage === undefined ? browserStorage() : options.storage;
  const store = createJsonStore(port);
  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;
  const repository = createSessionRepository({ store, now, random });
  const listeners = new Set<() => void>();
  let browser: Window | null = null;
  let view = initialView(store, repository);

  function publish(next: GameView) {
    view = { ...next, storageAvailable: store.isAvailable() };

    for (const listener of listeners) {
      listener();
    }
  }

  function dispatch(intent: Intent) {
    const next = applyIntent({ view, store, repository, now, random }, intent);

    if (next) {
      publish(next);
    }
  }

  /** Any session saved by another tab replaces the cached one; the visible one is shown at once. */
  function onExternalChange(event: StorageEvent) {
    const changed =
      event.key === null ? null : repository.acceptExternal(event.key, event.newValue);

    if (changed?.mode === view.mode && changed.level === view.level) {
      publish(sessionView(view, changed.session));
    }
  }

  function connect(target: Window) {
    browser = target;
    target.addEventListener('storage', onExternalChange);

    return () => {
      target.removeEventListener('storage', onExternalChange);
      browser = null;
    };
  }

  function shareResult(language: Language): Promise<ShareOutcome> {
    const text = buildShareText({
      session: view.session,
      language,
      elapsedLabel: formatElapsed(elapsedSeconds(view.session, now())),
      origin: browser?.location.origin ?? '',
    });

    return deliverShare(browser, text);
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }

  return { getSnapshot: () => view, subscribe, dispatch, connect, shareResult };
}

export type GameController = ReturnType<typeof createGameController>;

export function namedClubs(found: readonly ClubId[]) {
  return found.flatMap((id) => {
    const club = clubById.get(id);

    return club ? [club] : [];
  });
}

export function elapsedSeconds(session: Session, now: number) {
  const round = session.round;

  if (round.phase === 'complete') {
    return round.elapsed;
  }

  if (round.phase === 'playing') {
    return secondsBetween(round.startedAt, now);
  }

  return 0;
}

function twoDigits(value: number) {
  return String(value).padStart(2, '0');
}

export function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);

  return `${twoDigits(minutes)}:${twoDigits(seconds % 60)}`;
}
