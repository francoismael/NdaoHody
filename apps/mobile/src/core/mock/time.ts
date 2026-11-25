import { addMinutes, toIsoWithOffset } from '@/shared/utils';

/** Antananarivo is UTC+03:00 all year (no daylight saving). */
const TANA_UTC_OFFSET_MINUTES = 180;

export const iso = (date: Date): string => toIsoWithOffset(date, TANA_UTC_OFFSET_MINUTES);

/** ISO date `minutes` from `now` (negative = in the past). */
export const isoIn = (now: Date, minutes: number): string => iso(addMinutes(now, minutes));

export const DAY_MINUTES = 24 * 60;

/** Minutes from `now` to a Tana clock time, `dayOffset` days later (1 = tomorrow). */
export function minutesUntilLocalTime(now: Date, dayOffset: number, hour: number, minute: number): number {
  const offsetMs = TANA_UTC_OFFSET_MINUTES * 60_000;
  const local = new Date(now.getTime() + offsetMs);
  const target =
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + dayOffset, hour, minute) - offsetMs;
  return Math.round((target - now.getTime()) / 60_000);
}
