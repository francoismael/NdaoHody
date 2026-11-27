/** Helpers to read JSON from outside services safely (their answers are `unknown`). */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** A non-empty trimmed string, or null. */
export function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/** [longitude, latitude] as in GeoJSON. */
export function isLngLat(value: unknown): value is [number, number] {
  return Array.isArray(value) && typeof value[0] === 'number' && typeof value[1] === 'number';
}
