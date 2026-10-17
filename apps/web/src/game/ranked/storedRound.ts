/**
 * The ranked round this tab is playing, kept in sessionStorage so a reload can resume it. Each tab
 * plays its own round, which is why this is not in localStorage.
 */
import { z } from 'zod';
import type { QueuedEntry } from './answerQueue';
import type { RankedMode } from './api';

export type SessionStoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type StoredRound = Readonly<{
  roundId: string;
  mode: RankedMode;
  /** The server clock offset measured when the round started, so a reload keeps the same timer. */
  offset: number;
  entries: readonly QueuedEntry[];
}>;

const storedRoundKey = 'nxc-ranked-round';

const storedRoundSchema = z.object({
  roundId: z.string().min(1),
  mode: z.enum(['t10', 't50', 't100']),
  offset: z.number(),
  entries: z.array(z.object({ seq: z.number().int(), text: z.string(), enteredAt: z.number() })),
});

/** Entries are numbered one after another; anything else cannot be resent safely. */
function isContiguous(entries: readonly QueuedEntry[]) {
  const firstSeq = entries[0]?.seq ?? 0;

  return entries.every((entry, index) => entry.seq === firstSeq + index);
}

export function readStoredRound(storage: SessionStoragePort | null): StoredRound | null {
  try {
    const raw = storage?.getItem(storedRoundKey);

    if (!raw) {
      return null;
    }

    const parsed = storedRoundSchema.safeParse(JSON.parse(raw));

    if (!parsed.success || !isContiguous(parsed.data.entries)) {
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

export function writeStoredRound(storage: SessionStoragePort | null, round: StoredRound) {
  try {
    storage?.setItem(storedRoundKey, JSON.stringify(round));
  } catch {
    // A full or blocked storage only costs resuming after a reload.
  }
}

export function clearStoredRound(storage: SessionStoragePort | null) {
  try {
    storage?.removeItem(storedRoundKey);
  } catch {
    // Nothing to clean up when storage is blocked.
  }
}
