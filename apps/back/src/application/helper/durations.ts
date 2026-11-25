export const SECOND_MS = 1000;
export const MINUTE_MS = 60 * SECOND_MS;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** Date `ms` milliseconds after `date`. */
export function addMs(date: Date, ms: number): Date {
  return new Date(date.getTime() + ms);
}

/** Whole seconds from `from` to `to`, rounded up (0 when `to` is in the past). */
export function secondsUntil(from: Date, to: Date): number {
  return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / SECOND_MS));
}
