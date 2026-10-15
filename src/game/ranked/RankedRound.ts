/**
 * One server-ranked round, seen from the browser.
 *
 * Answers go to the server one request at a time; answers typed meanwhile wait and go together in
 * the next request. The server's `found` list and phase are the truth. When the server cannot be
 * reached for `connectionTimeoutMs`, the round stops being ranked and the local game carries on.
 */
import type { ClubId } from '../../content/catalog';
import type { Locale } from '../../i18n/config';
import type { Ranks } from '../../server/rounds/types';
import { AnswerQueue, type QueuedEntry } from './answerQueue';
import type {
  AnswersResponse,
  ApiResult,
  Finished,
  RankedApi,
  RankedMode,
  RoundView,
  StartedBody,
} from './api';
import { roundMsAt, serverOffset, toClientTime } from './clock';
import {
  clearStoredRound,
  type SessionStoragePort,
  type StoredRound,
  writeStoredRound,
} from './storedRound';

export const connectionTimeoutMs = 15_000;

const firstRetryMs = 500;

const maxRetryMs = 4_000;

const finishAttempts = 3;

export type RankedStatus =
  /** Waiting for the server to start or resume the round. */
  | 'connecting'
  /** The server is taking answers. */
  | 'live'
  /** The server reached the target; asking for the ranks. */
  | 'settling'
  /** The server's result is final. */
  | 'settled'
  /** The player finished early. */
  | 'abandoned'
  /** The round is played locally only. */
  | 'unranked';

export type RankedResult = Readonly<{
  status: Finished['status'];
  elapsedMs: number | null;
  ranks: Ranks | null;
}>;

export type RankedSnapshot = Readonly<{
  status: RankedStatus;
  mode: RankedMode;
  /** The player's name, from the server. */
  displayName: string | null;
  /** The server's found clubs, or null before it has answered. */
  found: readonly ClubId[] | null;
  /** When the server started the round, on the client clock. */
  startedAt: number | null;
  /** True while answers are waiting for the server. */
  syncing: boolean;
  result: RankedResult | null;
}>;

export type RankedRoundOptions = Readonly<{
  api: RankedApi;
  storage: SessionStoragePort | null;
  lang: Locale;
  now: () => number;
}>;

type Timer = ReturnType<typeof setTimeout>;

/** Offline, overloaded or rate limited: worth another try. Anything else will not change. */
function isRetryable(status: number) {
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

/** The id of the player's open round when the server refuses a start because of it. */
function staleRoundIdFrom(result: ApiResult<StartedBody>) {
  if (result.ok || result.status !== 409 || result.body?.error !== 'RoundInProgress') {
    return null;
  }

  return result.body.roundId ?? null;
}

function initialSnapshot(mode: RankedMode): RankedSnapshot {
  return {
    status: 'connecting',
    mode,
    displayName: null,
    found: null,
    startedAt: null,
    syncing: false,
    result: null,
  };
}

export class RankedRound {
  private snapshot: RankedSnapshot;

  private readonly listeners = new Set<() => void>();

  private readonly queue: AnswerQueue;

  private roundId: string | null = null;

  private serverStartedAt = 0;

  private offset = 0;

  /** The offset measured when the round started, kept across reloads. */
  private startOffset: number | null = null;

  private inFlight = false;

  private retries = 0;

  private retryTimer: Timer | null = null;

  private watchdog: Timer | null = null;

  private disposed = false;

  private constructor(
    mode: RankedMode,
    private readonly options: RankedRoundOptions,
    entries: readonly QueuedEntry[] = [],
  ) {
    this.snapshot = initialSnapshot(mode);
    this.queue = new AnswerQueue(entries);
  }

  /** Asks the server for a new round. */
  static start(mode: RankedMode, options: RankedRoundOptions) {
    const round = new RankedRound(mode, options);
    void round.begin();

    return round;
  }

  /** Picks up the round this tab was playing before a reload. */
  static resume(stored: StoredRound, options: RankedRoundOptions) {
    const round = new RankedRound(stored.mode, options, stored.entries);
    round.roundId = stored.roundId;
    round.startOffset = stored.offset;
    void round.reconnect();

    return round;
  }

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Sends one composer entry. Entries typed before the round starts wait for it. */
  submit(text: string) {
    if (!this.isAcceptingAnswers()) {
      return;
    }

    this.queue.add(text, this.options.now());
    this.save();
    this.update({ syncing: true });
    void this.pump();
  }

  /** The player stops early. The server marks the round abandoned. */
  abandon() {
    if (!this.isAcceptingAnswers()) {
      return;
    }

    this.stopTimers();
    this.update({ status: 'abandoned', syncing: false });
    clearStoredRound(this.options.storage);
    this.sendAbandon();
  }

  /** Stops every timer and ignores any answer still on its way. */
  dispose() {
    this.disposed = true;
    this.stopTimers();
  }

  /** Forgets the round in this tab, so a reload does not resume it. */
  forget() {
    this.dispose();
    clearStoredRound(this.options.storage);
  }

  private isAcceptingAnswers() {
    const { status } = this.snapshot;

    return status === 'connecting' || status === 'live';
  }

  /**
   * Starts the round. A round left open by a closed tab blocks a new one, so it is closed (the
   * server records it as abandoned) and the start is tried once more.
   */
  private async requestStart() {
    const { api, now, lang } = this.options;
    const sentAt = now();
    const result = await api.start(this.snapshot.mode, lang);
    const staleRoundId = staleRoundIdFrom(result);

    if (staleRoundId === null || this.disposed) {
      return { result, sentAt };
    }

    await api.finish(staleRoundId, lang);

    const retrySentAt = now();

    return { result: await api.start(this.snapshot.mode, lang), sentAt: retrySentAt };
  }

  private async begin() {
    this.startWaiting();
    const { result, sentAt } = await this.requestStart();

    if (this.disposed) {
      return;
    }

    if (!result.ok) {
      this.fallBack();
      return;
    }

    this.roundId = result.body.roundId;

    // The player gave up, or the start came too late: the round is not played, so close it.
    if (this.snapshot.status !== 'connecting') {
      this.sendAbandon();
      return;
    }

    this.onStarted(result.body, sentAt);
  }

  private onStarted(started: StartedBody, sentAt: number) {
    this.adoptClock(started.serverNow, started.startedAt, sentAt);
    this.stopWaiting();
    this.save();
    this.update({
      status: 'live',
      displayName: started.displayName,
      startedAt: toClientTime(started.startedAt, this.offset),
    });
    void this.pump();
  }

  private async reconnect() {
    const roundId = this.roundId;

    if (roundId === null) {
      return;
    }

    const { api, now, lang } = this.options;
    const sentAt = now();
    this.startWaiting();
    const result = await api.resume(roundId, lang);

    if (this.disposed) {
      return;
    }

    if (!result.ok) {
      this.fallBack();
      return;
    }

    this.onResumed(result.body, sentAt);
  }

  private onResumed(view: RoundView, sentAt: number) {
    this.stopWaiting();
    this.adoptClock(view.serverNow, view.startedAt, sentAt);
    this.queue.acknowledge(view.nextSeq);
    this.update({
      displayName: view.displayName,
      found: view.found,
      startedAt: toClientTime(view.startedAt, this.offset),
    });

    if (view.status === 'abandoned') {
      clearStoredRound(this.options.storage);
      this.update({ status: 'abandoned', syncing: false });
      return;
    }

    if (view.phase === 'complete') {
      void this.settle({ status: view.status, elapsedMs: view.elapsedMs, ranks: null });
      return;
    }

    this.update({ status: 'live', syncing: this.queue.hasPending() });
    void this.pump();
  }

  private adoptClock(serverNow: number, startedAt: number, sentAt: number) {
    this.offset = this.startOffset ?? serverOffset(serverNow, sentAt, this.options.now());
    this.startOffset = this.offset;
    this.serverStartedAt = startedAt;
  }

  /** Sends the next batch unless one is already on its way. */
  private async pump() {
    const roundId = this.roundId;

    if (this.inFlight || this.snapshot.status !== 'live' || roundId === null) {
      return;
    }

    const batch = this.queue.nextBatch();

    if (batch === null) {
      this.update({ syncing: false });
      return;
    }

    const entries = batch.entries.map((entry) => ({
      text: entry.text,
      clientMs: roundMsAt(entry.enteredAt, this.serverStartedAt, this.offset),
    }));

    this.inFlight = true;
    this.startWaiting();
    const result = await this.options.api.answers(roundId, batch.seq, entries);
    this.inFlight = false;

    if (this.disposed || this.snapshot.status !== 'live') {
      return;
    }

    this.onAnswersResult(result);
  }

  private onAnswersResult(result: ApiResult<AnswersResponse>) {
    if (result.ok) {
      this.onAnswered(result.body);
      return;
    }

    const error = result.body?.error;

    if (result.status === 409 && error === 'SeqGap') {
      this.resendFrom(result.body?.expectedSeq);
      return;
    }

    if (result.status === 409 && error === 'RoundClosed') {
      // The round ended on the server (it reached the target, or expired): read how it ended.
      this.update({ status: 'connecting' });
      void this.reconnect();
      return;
    }

    if (isRetryable(result.status)) {
      this.retryLater();
      return;
    }

    this.fallBack();
  }

  private onAnswered(response: AnswersResponse) {
    this.retries = 0;
    this.stopWaiting();
    this.queue.acknowledge(response.nextSeq);

    if (response.phase === 'complete' && response.result) {
      this.update({ found: response.found, syncing: false });
      void this.settle({ ...response.result, ranks: null });
      return;
    }

    this.update({ found: response.found, syncing: this.queue.hasPending() });
    void this.pump();
  }

  private resendFrom(expectedSeq: number | undefined) {
    if (expectedSeq === undefined || !this.queue.rewind(expectedSeq)) {
      this.fallBack();
      return;
    }

    void this.pump();
  }

  private retryLater() {
    const delay = Math.min(maxRetryMs, firstRetryMs * 2 ** this.retries);
    this.retries += 1;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.pump();
    }, delay);
  }

  /** The server has the final time; the finish call adds the ranks and the player's name. */
  private async settle(result: RankedResult) {
    const roundId = this.roundId;
    this.stopTimers();
    this.update({ status: 'settling', syncing: false, result });

    if (roundId === null) {
      return;
    }

    const finished = await this.finishWithRetries(roundId);

    if (this.disposed) {
      return;
    }

    if (finished === null) {
      this.update({ status: 'settled' });
      return;
    }

    const { displayName, ...settled } = finished;
    this.update({ status: 'settled', displayName, result: settled });
  }

  private async finishWithRetries(roundId: string): Promise<Finished | null> {
    for (let attempt = 0; attempt < finishAttempts; attempt += 1) {
      const result = await this.options.api.finish(roundId, this.options.lang);

      if (result.ok) {
        return result.body;
      }

      if (!isRetryable(result.status) || this.disposed) {
        return null;
      }

      await new Promise((resolve) => setTimeout(resolve, firstRetryMs * 2 ** attempt));
    }

    return null;
  }

  /** Too long without the server, or a failure that will not go away: carry on locally. */
  private fallBack() {
    if (!this.isAcceptingAnswers()) {
      return;
    }

    this.stopTimers();
    this.update({ status: 'unranked', syncing: false });
    clearStoredRound(this.options.storage);
    // Close the round on the server too, if it is reachable, so the next one can be ranked.
    this.sendAbandon();
  }

  private sendAbandon() {
    if (this.roundId !== null) {
      void this.options.api.finish(this.roundId, this.options.lang);
    }
  }

  private save() {
    if (this.roundId === null) {
      return;
    }

    writeStoredRound(this.options.storage, {
      roundId: this.roundId,
      mode: this.snapshot.mode,
      offset: this.offset,
      entries: this.queue.all(),
    });
  }

  /** Starts the connection clock, unless it is already running since the last success. */
  private startWaiting() {
    if (this.watchdog !== null) {
      return;
    }

    this.watchdog = setTimeout(() => {
      this.watchdog = null;
      this.fallBack();
    }, connectionTimeoutMs);
  }

  private stopWaiting() {
    if (this.watchdog !== null) {
      clearTimeout(this.watchdog);
      this.watchdog = null;
    }
  }

  private stopTimers() {
    this.stopWaiting();

    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private update(patch: Partial<RankedSnapshot>) {
    if (this.disposed) {
      return;
    }

    this.snapshot = { ...this.snapshot, ...patch };

    for (const listener of this.listeners) {
      listener();
    }
  }
}
