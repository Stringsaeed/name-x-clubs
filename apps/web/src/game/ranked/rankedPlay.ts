/**
 * The game as the screen uses it: the local controller, plus a ranked round for Free time.
 *
 * Practice, and Free time without a server, behave exactly as the local controller does. A ranked
 * round only adds to it: answers also go to the server, whose clubs and clock are shown.
 */
import type { Locale } from '@nxc/game/i18n/config';
import type { Language, Level, Mode } from '@nxc/game/model';
import type { GameController, GameView } from '../controller';
import { buildShareText, deliverShare, type ShareOutcome } from '../session/share';
import type { RankedApi } from './api';
import { formatRankedTime } from './clock';
import { RankedRound, type RankedSnapshot } from './RankedRound';
import { isRankedRoundOf, rankedModeFor, rankedView } from './rankedView';
import { clearStoredRound, readStoredRound, type SessionStoragePort } from './storedRound';

export type PlaySnapshot = Readonly<{ view: GameView; ranked: RankedSnapshot | null }>;

export type RankedPlayOptions = Readonly<{
  controller: GameController;
  /** Null plays every round locally. */
  api: RankedApi | null;
  storage: SessionStoragePort | null;
  lang: Locale;
  now?: () => number;
}>;

export class RankedPlay {
  private round: RankedRound | null = null;

  private stopWatchingRound: (() => void) | null = null;

  private readonly listeners = new Set<() => void>();

  private stopWatchingController: (() => void) | null = null;

  private cached: PlaySnapshot | null = null;

  /** The controller view `cached` was made from. */
  private cachedFrom: GameView | null = null;

  private browser: Window | null = null;

  private resumeChecked = false;

  private readonly now: () => number;

  constructor(private readonly options: RankedPlayOptions) {
    this.now = options.now ?? Date.now;
  }

  getSnapshot = (): PlaySnapshot => {
    const view = this.options.controller.getSnapshot();
    const ranked = this.round?.getSnapshot() ?? null;
    const cached = this.cached;

    if (cached !== null && this.cachedFrom === view && cached.ranked === ranked) {
      return cached;
    }

    this.cachedFrom = view;
    this.cached = { view: rankedView(view, ranked), ranked };

    return this.cached;
  };

  /** Watches the controller only while someone watches this, so creating one has no effects. */
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);

    if (this.stopWatchingController === null) {
      this.stopWatchingController = this.options.controller.subscribe(() => this.notify());
    }

    return () => {
      this.listeners.delete(listener);

      if (this.listeners.size === 0) {
        this.stopWatchingController?.();
        this.stopWatchingController = null;
      }
    };
  };

  /** Sharing goes through `browser`. A ranked round from before a reload is resumed once. */
  connect(browser: Window | null) {
    this.browser = browser;
    this.resumeStoredRound();

    return () => {
      this.browser = null;
    };
  }

  changeMode = (mode: Mode) => this.options.controller.dispatch({ type: 'mode', mode });

  changeLevel = (level: Level) => this.options.controller.dispatch({ type: 'level', level });

  changeCategory = (category: string) =>
    this.options.controller.dispatch({ type: 'practice', category });

  startRound = () => {
    const { controller, api } = this.options;
    controller.dispatch({ type: 'start' });

    const view = controller.getSnapshot();

    if (api === null || view.session.kind !== 'free' || view.session.round.phase !== 'playing') {
      return;
    }

    this.attach(RankedRound.start(rankedModeFor(view.level), this.roundOptions(api)));
  };

  /** Returns true when the composer should clear: a club was accepted, or the server has it. */
  submitAnswer = (text: string) => {
    const { controller } = this.options;
    const before = controller.getSnapshot().session.round;

    controller.dispatch({ type: 'answer', text });

    const after = controller.getSnapshot().session.round;
    const accepted = after.found.length > before.found.length;
    const round = this.activeRound();

    if (round === null) {
      return accepted;
    }

    round.submit(text);

    // Only the server can judge an entry the local round no longer takes.
    return accepted || before.phase !== 'playing';
  };

  finishRound = () => {
    this.options.controller.dispatch({ type: 'finish' });
    this.activeRound()?.abandon();
  };

  nextRound = () => {
    this.detach();
    this.options.controller.dispatch({ type: 'restart' });
  };

  shareResult = (language: Language): Promise<ShareOutcome> => {
    const { view, ranked } = this.getSnapshot();
    const elapsedMs = ranked?.result?.elapsedMs ?? null;

    if (elapsedMs === null || !isRankedRoundOf(view, ranked)) {
      return this.options.controller.shareResult(language);
    }

    const text = buildShareText({
      session: view.session,
      language,
      elapsedLabel: formatRankedTime(elapsedMs),
      origin: this.browser?.location.origin ?? '',
    });

    return deliverShare(this.browser, text);
  };

  dispose() {
    this.round?.dispose();
    this.stopWatchingRound?.();
  }

  private activeRound() {
    const round = this.round;

    if (
      round === null ||
      !isRankedRoundOf(this.options.controller.getSnapshot(), round.getSnapshot())
    ) {
      return null;
    }

    return round;
  }

  private roundOptions(api: RankedApi) {
    return { api, storage: this.options.storage, lang: this.options.lang, now: this.now };
  }

  private resumeStoredRound() {
    const { api, storage, controller } = this.options;

    if (this.resumeChecked || api === null) {
      return;
    }

    this.resumeChecked = true;
    const stored = readStoredRound(storage);

    if (stored === null) {
      return;
    }

    const view = controller.getSnapshot();
    const stillOnScreen =
      view.session.kind === 'free' &&
      view.session.round.phase !== 'idle' &&
      rankedModeFor(view.level) === stored.mode;

    if (!stillOnScreen) {
      clearStoredRound(storage);
      return;
    }

    this.attach(RankedRound.resume(stored, this.roundOptions(api)));
  }

  private attach(round: RankedRound) {
    this.detach();
    this.round = round;
    this.stopWatchingRound = round.subscribe(() => this.notify());
    this.notify();
  }

  private detach() {
    this.stopWatchingRound?.();
    this.stopWatchingRound = null;
    this.round?.forget();
    this.round = null;
  }

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
