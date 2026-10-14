/**
 * Pace policy for ranked rounds. Pure: it judges times the server measured, and uses client
 * times only as a consistency check. Tune the numbers from logged gaps after launch.
 */
import type { RankedMode } from './modes';

/** Faster than this cannot be typed by a person: the round is rejected. */
export const impossibleUnderMs: Readonly<Record<RankedMode, number>> = {
  t10: 5_000,
  t50: 30_000,
  t100: 60_000,
};

/** Faster than this is possible but rare: the round is held off public boards. */
export const suspiciousUnderMs: Readonly<Record<RankedMode, number>> = {
  t10: 10_000,
  t50: 60_000,
  t100: 120_000,
};

/** How far a client time may run ahead of the server's receive time (network and clock jitter). */
export const clientClockToleranceMs = 5_000;

export type PaceFlag = 'client-clock-ahead' | 'fast-pace';

export type PaceVerdict = 'ok' | 'suspicious' | 'impossible';

export type BatchTiming = Readonly<{ receivedMs: number; clientMs: readonly number[] }>;

/**
 * A client starts its timer after the server stamps `started_at`, so its times should never be
 * ahead of when the server received them.
 */
export function batchFlags({ receivedMs, clientMs }: BatchTiming): PaceFlag[] {
  const aheadOfServer = clientMs.some((time) => time > receivedMs + clientClockToleranceMs);

  if (aheadOfServer) {
    return ['client-clock-ahead'];
  }

  return [];
}

export function paceVerdict(
  mode: RankedMode,
  elapsedMs: number,
  flags: readonly PaceFlag[],
): { verdict: PaceVerdict; flags: PaceFlag[] } {
  if (elapsedMs < impossibleUnderMs[mode]) {
    return { verdict: 'impossible', flags: [...flags] };
  }

  const allFlags = [...flags];

  if (elapsedMs < suspiciousUnderMs[mode]) {
    allFlags.push('fast-pace');
  }

  if (allFlags.length > 0) {
    return { verdict: 'suspicious', flags: allFlags };
  }

  return { verdict: 'ok', flags: [] };
}
