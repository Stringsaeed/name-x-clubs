import {
  type Level,
  levelSchema,
  type Mode,
  modeSchema,
  type Session,
  secondsBetween,
} from '../../web/src/game/model';
import { applyIntent, type GameView, type Intent } from '../../web/src/game/session/intents';
import { createSessionRepository } from '../../web/src/game/session/repository';
import {
  createJsonStore,
  levelKey,
  modeKey,
  type StoragePort,
} from '../../web/src/game/session/storage';

const defaultLevel: Level = 10;
const defaultMode: Mode = 'free';

function initialView(
  store: ReturnType<typeof createJsonStore>,
  repository: ReturnType<typeof createSessionRepository>,
): GameView {
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

export type Play = Readonly<{
  getSnapshot: () => GameView;
  subscribe: (listener: () => void) => () => void;
  dispatch: (intent: Intent) => void;
}>;

/** Same round rules as the website, with a synchronous storage port the phone fills first. */
export function createPlay(port: StoragePort): Play {
  const store = createJsonStore(port);
  const now = () => Date.now();
  const random = () => Math.random();
  const repository = createSessionRepository({ store, now, random });
  const listeners = new Set<() => void>();
  let view = initialView(store, repository);

  function publish(next: GameView) {
    view = { ...next, storageAvailable: store.isAvailable() };

    for (const listener of listeners) {
      listener();
    }
  }

  return {
    getSnapshot: () => view,
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    dispatch(intent) {
      const next = applyIntent({ view, store, repository, now, random }, intent);

      if (next) {
        publish(next);
      }
    },
  };
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
