import type { Position } from '@contract';
import { isRecord } from './json';

/** A position sent by the app over WebSocket (not checked by the HTTP validation): null when malformed. */
export function readPosition(value: unknown): Position | null {
  if (!isRecord(value)) {
    return null;
  }
  const { latitude, longitude } = value;
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return null;
  }
  return { latitude, longitude };
}

/** A positive whole number (an id) sent over WebSocket, or null. */
export function readId(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}
