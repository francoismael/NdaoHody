import { useEffect, useRef, useState } from 'react';

import type { LngLat } from './geo';

/** About 15 redraws per second: smooth enough, light on a mid-range phone. */
const FRAME_MS = 66;
/**
 * A coordinate older than this many glides is stale (the app was in the background, timers paused):
 * it is shown at once instead of replaying the missed road in one glide.
 */
const STALE_GLIDES = 2;

/**
 * Where a moving point is drawn now: it glides from the drawn point to each new coordinate.
 * The glide lasts as long as the time since the previous coordinate (never less than `glideMs`):
 * data that comes every 5.6 s (5 s + the network) glides 5.6 s, so the point never stops between two.
 * `glideMs` 0: no glide. Real time, not the demo clock. Knows nothing about carpooling.
 */
export function useGlide(coordinate: LngLat, glideMs: number): LngLat {
  const [shown, setShown] = useState<LngLat>(coordinate);
  const shownRef = useRef<LngLat>(coordinate);
  // When the last coordinate arrived (0 = not yet: the first one is shown at once).
  const receivedAt = useRef(0);
  const [lng, lat] = coordinate;

  useEffect(() => {
    const from = shownRef.current;
    const to: LngLat = [lng, lat];
    const show = (point: LngLat): void => {
      shownRef.current = point;
      setShown(point);
    };
    const now = Date.now();
    const since = now - receivedAt.current;
    receivedAt.current = now;
    if (glideMs <= 0 || since > glideMs * STALE_GLIDES || (from[0] === to[0] && from[1] === to[1])) {
      show(to);
      return undefined;
    }
    const duration = Math.max(glideMs, since);
    const timer = setInterval(() => {
      const t = Math.min(1, (Date.now() - now) / duration);
      show([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]);
      if (t === 1) clearInterval(timer);
    }, FRAME_MS);
    return () => clearInterval(timer);
  }, [lng, lat, glideMs]);

  return glideMs > 0 ? shown : coordinate;
}
