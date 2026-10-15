/**
 * The server's clock as seen from the browser, and how ranked times are written.
 */

/**
 * How far the server clock is ahead of this one. `serverNow` is taken half-way through the
 * request, on average, so the round trip is split evenly.
 */
export function serverOffset(serverNow: number, sentAt: number, receivedAt: number) {
  return serverNow - (sentAt + receivedAt) / 2;
}

/** A server timestamp on the client clock. */
export function toClientTime(serverTime: number, offset: number) {
  return serverTime - offset;
}

/** Milliseconds since the server started the round, for an event at client time `at`. */
export function roundMsAt(at: number, serverStartedAt: number, offset: number) {
  return Math.max(0, Math.round(at + offset - serverStartedAt));
}

function twoDigits(value: number) {
  return String(value).padStart(2, '0');
}

/** `mm:ss.t`, the precision ranked boards use. Tenths are truncated, never rounded up. */
export function formatRankedTime(elapsedMs: number) {
  const tenths = Math.floor(Math.max(0, elapsedMs) / 100);
  const seconds = Math.floor(tenths / 10);
  const minutes = Math.floor(seconds / 60);

  return `${twoDigits(minutes)}:${twoDigits(seconds % 60)}.${tenths % 10}`;
}
