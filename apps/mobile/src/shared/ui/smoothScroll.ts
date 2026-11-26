import type { RefObject } from 'react';
import { AccessibilityInfo, type ScrollViewInstance } from 'react-native';

/** Slower than the native smooth scroll (~250 ms), so the eye can follow. */
const SMOOTH_SCROLL_MS = 450;

/** Starts slowly, speeds up, slows down at the end (cubic ease-in-out). */
const easeInOutCubic = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Scrolls `area` from `from` to `to` with an ease-in-out, frame by frame (the native
 * `scrollTo({ animated: true })` has a fixed speed and no easing). With reduced motion
 * (Android "Remove animations"), it jumps. Resolves with how to stop the movement.
 */
export async function smoothScrollTo(area: ScrollViewInstance, from: number, to: number): Promise<() => void> {
  if (await AccessibilityInfo.isReduceMotionEnabled()) {
    area.scrollTo({ y: to, animated: false });
    return () => undefined;
  }
  let frame = 0;
  const start = Date.now();
  const step = (): void => {
    const progress = Math.min(1, (Date.now() - start) / SMOOTH_SCROLL_MS);
    area.scrollTo({ y: from + (to - from) * easeInOutCubic(progress), animated: false });
    if (progress < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frame);
}

/** Stops the movement kept in `stop` (from smoothScrollTo), if any. */
export function stopSmoothScroll(stop: RefObject<(() => void) | null>): void {
  stop.current?.();
  stop.current = null;
}
