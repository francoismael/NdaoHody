/**
 * The app's single clock. Real time by default (and always in production).
 * The demo panel can speed it up or jump ahead; every time-based rule
 * (3 min expiry, 15 min wait, driver movement, countdowns on screen)
 * reads this clock, so they all stay in step.
 *
 * Time is computed from dates, never counted tick by tick: when Android
 * pauses JavaScript in the background, the clock is still right on return.
 */

/** A speed change re-anchors the clock, so time never jumps backwards. */
export interface ClockState {
  anchorRealMs: number;
  anchorClockMs: number;
  speed: number;
}

let state: ClockState | null = null;
const listeners = new Set<() => void>();

const emit = (): void => listeners.forEach((listener) => listener());

export function currentTimeMs(): number {
  if (!state) return Date.now();
  return state.anchorClockMs + (Date.now() - state.anchorRealMs) * state.speed;
}

export const currentTime = (): Date => new Date(currentTimeMs());

export const clockSpeed = (): number => state?.speed ?? 1;

/** 1 = real time, 10 = ten times faster. */
export function setClockSpeed(speed: number): void {
  if (!Number.isFinite(speed) || speed <= 0) throw new RangeError(`Invalid clock speed: ${speed}`);
  state = { anchorRealMs: Date.now(), anchorClockMs: currentTimeMs(), speed };
  emit();
}

/** Jumps forward (e.g. +3 min to force an expiry). */
export function advanceClock(ms: number): void {
  if (!Number.isFinite(ms) || ms <= 0) throw new RangeError(`Invalid clock jump: ${ms}`);
  state = { anchorRealMs: Date.now(), anchorClockMs: currentTimeMs() + ms, speed: clockSpeed() };
  emit();
}

/** Back to real time (demo reset). */
export function resetClock(): void {
  state = null;
  emit();
}

/** For saving: null means real time. */
export const getClockState = (): ClockState | null => (state ? { ...state } : null);

/** Restores a saved clock, so a sped-up demo survives an app restart. */
export function restoreClock(saved: ClockState | null): void {
  state = saved ? { ...saved } : null;
  emit();
}

/** Notified on speed change, jump or reset (not on every tick). Returns the unsubscribe. */
export function subscribeClock(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
