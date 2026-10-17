import type { Locale } from '@nxc/game/i18n/config';

const msPerSecond = 1000;
const secondsPerMinute = 60;
const minutesPerHour = 60;
const hoursPerDay = 24;
const justNowSeconds = 45;

/** Elapsed time as `mm:ss.t` (tenths truncated, minutes may pass 59). */
export function formatElapsed(elapsedMs: number): string {
  const totalTenths = Math.floor(Math.max(0, elapsedMs) / 100);
  const tenths = totalTenths % 10;
  const totalSeconds = Math.floor(totalTenths / 10);
  const seconds = totalSeconds % secondsPerMinute;
  const minutes = Math.floor(totalSeconds / secondsPerMinute);

  return `${pad(minutes)}:${pad(seconds)}.${tenths}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** "14m ago" in the page language, relative to `nowMs` so server and client render the same. */
export function formatRelative(achievedAt: string, nowMs: number, lang: Locale): string {
  const formatter = new Intl.RelativeTimeFormat(lang, { numeric: 'auto', style: 'narrow' });
  const secondsAgo = Math.max(0, Math.floor((nowMs - Date.parse(achievedAt)) / msPerSecond));

  if (secondsAgo < justNowSeconds) {
    return formatter.format(0, 'second');
  }

  const minutesAgo = Math.floor(secondsAgo / secondsPerMinute);

  if (minutesAgo < minutesPerHour) {
    return formatter.format(-Math.max(1, minutesAgo), 'minute');
  }

  const hoursAgo = Math.floor(minutesAgo / minutesPerHour);

  if (hoursAgo < hoursPerDay) {
    return formatter.format(-hoursAgo, 'hour');
  }

  return formatter.format(-Math.floor(hoursAgo / hoursPerDay), 'day');
}
