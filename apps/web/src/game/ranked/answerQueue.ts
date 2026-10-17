/**
 * The answers of one ranked round, numbered in the order they were typed. Entries stay after the
 * server acknowledges them, so a batch can be resent from any `seq` the server asks for.
 */

/** The server limits, mirrored so a batch is never rejected for its size. */
export const maxEntryLength = 120;

export const maxEntriesPerRequest = 10;

export type QueuedEntry = Readonly<{
  seq: number;
  text: string;
  /** Client clock time when the answer was typed. */
  enteredAt: number;
}>;

export type Batch = Readonly<{ seq: number; entries: readonly QueuedEntry[] }>;

export class AnswerQueue {
  private entries: QueuedEntry[];

  /** The `seq` of `entries[0]`. */
  private firstSeq: number;

  /** The server's `nextSeq`: every entry before it has been applied. */
  private acknowledged: number;

  /** `entries` must be numbered one after another. */
  constructor(entries: readonly QueuedEntry[] = []) {
    this.entries = [...entries];
    this.firstSeq = entries[0]?.seq ?? 0;
    this.acknowledged = this.firstSeq;
  }

  private get endSeq() {
    return this.firstSeq + this.entries.length;
  }

  add(text: string, enteredAt: number): QueuedEntry {
    const entry = { seq: this.endSeq, text: text.slice(0, maxEntryLength), enteredAt };
    this.entries.push(entry);

    return entry;
  }

  /** The next request: up to ten entries from the first one the server has not applied. */
  nextBatch(): Batch | null {
    const start = this.acknowledged - this.firstSeq;
    const entries = this.entries.slice(start, start + maxEntriesPerRequest);

    if (entries.length === 0) {
      return null;
    }

    return { seq: this.acknowledged, entries };
  }

  /**
   * Records the server's `nextSeq`. A server ahead of every known entry (they were lost, say, with
   * the tab's storage) restarts the numbering there, so new entries are never taken for retries.
   */
  acknowledge(nextSeq: number) {
    if (nextSeq > this.endSeq) {
      this.entries = [];
      this.firstSeq = nextSeq;
    }

    this.acknowledged = Math.max(this.acknowledged, nextSeq);
  }

  /** Moves back to `expectedSeq` after a seq gap. False when that entry is no longer known. */
  rewind(expectedSeq: number): boolean {
    if (expectedSeq < this.firstSeq || expectedSeq > this.endSeq) {
      return false;
    }

    this.acknowledged = expectedSeq;

    return true;
  }

  hasPending(): boolean {
    return this.acknowledged < this.endSeq;
  }

  all(): readonly QueuedEntry[] {
    return this.entries;
  }
}
