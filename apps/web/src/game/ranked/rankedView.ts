/**
 * What the player sees during a ranked round: the local game, corrected by the server.
 *
 * The local round answers instantly. While answers are on their way its clubs are shown on top of
 * the server's; once the server has caught up, its list and its clock win.
 */
import type { ClubId } from '@nxc/game/content/catalog';
import type { Level, Round } from '@nxc/game/model';
import { targetByMode } from '../../server/rounds/modes';
import type { Ranks } from '../../server/rounds/types';
import type { GameView } from '../controller';
import type { RankedMode } from './api';
import type { RankedSnapshot } from './RankedRound';

export function rankedModeFor(level: Level): RankedMode {
  if (level === 50) {
    return 't50';
  }

  if (level === 100) {
    return 't100';
  }

  return 't10';
}

/** True when `ranked` is the round on screen: Free time, its level, and a round under way. */
export function isRankedRoundOf(view: GameView, ranked: RankedSnapshot | null) {
  if (ranked === null) {
    return false;
  }

  return (
    view.session.kind === 'free' &&
    view.level === targetByMode[ranked.mode] &&
    view.session.round.phase !== 'idle'
  );
}

/** Server clubs first, then the local ones the server has not confirmed yet. */
function withUnconfirmed(server: readonly ClubId[], local: readonly ClubId[]) {
  const known = new Set(server);

  return [...server, ...local.filter((id) => !known.has(id))];
}

function liveRound(local: Round, ranked: RankedSnapshot): Round {
  const startedAt = ranked.startedAt;

  if (startedAt === null) {
    return local;
  }

  // The local round reached the target first: wait for the server's verdict on the last batch.
  if (local.phase === 'complete' && ranked.syncing) {
    return local;
  }

  if (ranked.found === null || ranked.syncing) {
    return { phase: 'playing', found: withUnconfirmed(ranked.found ?? [], local.found), startedAt };
  }

  return { phase: 'playing', found: ranked.found, startedAt };
}

function serverRound(local: Round, ranked: RankedSnapshot): Round {
  const elapsedMs = ranked.result?.elapsedMs ?? null;

  if (ranked.status === 'live') {
    return liveRound(local, ranked);
  }

  if (elapsedMs === null) {
    return local;
  }

  return {
    phase: 'complete',
    found: ranked.found ?? local.found,
    elapsed: Math.floor(elapsedMs / 1000),
  };
}

/** The local view with the server's clubs, phase and clock applied. */
export function rankedView(view: GameView, ranked: RankedSnapshot | null): GameView {
  if (ranked === null || !isRankedRoundOf(view, ranked)) {
    return view;
  }

  const round = serverRound(view.session.round, ranked);

  if (round === view.session.round) {
    return view;
  }

  return { ...view, session: { ...view.session, round } };
}

export type RankedOutcome =
  /** Not a ranked round: Practice, or a round that ended early. */
  | Readonly<{ kind: 'local' }>
  /** Meant to be ranked, but played locally. */
  | Readonly<{ kind: 'unranked' }>
  /** Done on this device; the server has not answered yet. */
  | Readonly<{ kind: 'pending' }>
  | Readonly<{
      kind: 'verified' | 'review' | 'rejected';
      elapsedMs: number;
      ranks: Ranks | null;
      displayName: string | null;
    }>;

function settledKind(status: string) {
  if (status === 'verified') {
    return 'verified';
  }

  if (status === 'flagged') {
    return 'review';
  }

  return 'rejected';
}

/** How the result panel should present the round that just ended. */
export function rankedOutcome(view: GameView, ranked: RankedSnapshot | null): RankedOutcome {
  if (ranked === null || !isRankedRoundOf(view, ranked)) {
    return { kind: 'local' };
  }

  if (ranked.status === 'unranked') {
    return { kind: 'unranked' };
  }

  if (ranked.status === 'abandoned') {
    return { kind: 'local' };
  }

  const result = ranked.result;

  if (ranked.status !== 'settled' || result === null || result.elapsedMs === null) {
    return { kind: 'pending' };
  }

  return {
    kind: settledKind(result.status),
    elapsedMs: result.elapsedMs,
    ranks: result.ranks,
    displayName: ranked.displayName,
  };
}
