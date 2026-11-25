import { useEffect, useState } from 'react';

import { currentTimeMs } from './clock';

/** Whole seconds from the app clock to `targetMs` (0 once reached or when there is no target). */
export const secondsUntil = (targetMs: number | null): number =>
  targetMs === null ? 0 : Math.max(0, Math.ceil((targetMs - currentTimeMs()) / 1000));

/**
 * Seconds left until `targetMs`, refreshed every second. Reads the app clock,
 * so it follows the demo panel's speed and jumps (resend delay, 3 min, 15 min).
 */
export function useSecondsLeft(targetMs: number | null): number {
  const [left, setLeft] = useState(() => secondsUntil(targetMs));

  useEffect(() => {
    setLeft(secondsUntil(targetMs));
    if (targetMs === null) return undefined;
    const timer = setInterval(() => setLeft(secondsUntil(targetMs)), 1000);
    return () => clearInterval(timer);
  }, [targetMs]);

  return left;
}
