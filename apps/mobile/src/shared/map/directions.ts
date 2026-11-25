import { isRecord } from '@/shared/utils';

import type { LngLat } from './geo';
import { mapboxToken } from './token';

const TIMEOUT_MS = 8000;

export interface DrivingRoute {
  coordinates: LngLat[];
  distanceMeters: number;
  durationSeconds: number;
}

const isLngLat = (value: unknown): value is LngLat =>
  Array.isArray(value) && value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number';

function parseRoute(json: unknown): DrivingRoute | null {
  if (!isRecord(json) || !Array.isArray(json.routes)) return null;
  const route: unknown = json.routes[0];
  if (!isRecord(route) || !isRecord(route.geometry)) return null;
  const coordinates: unknown = route.geometry.coordinates;
  if (!Array.isArray(coordinates) || !coordinates.every(isLngLat)) return null;
  if (typeof route.distance !== 'number' || typeof route.duration !== 'number') return null;
  return {
    coordinates: coordinates.map(([lng, lat]) => [lng, lat]),
    distanceMeters: Math.round(route.distance),
    durationSeconds: Math.round(route.duration),
  };
}

/**
 * Road route through the given stops (Mapbox Directions, driving profile, ≤ 25 stops).
 * Returns null without token, without network, or on any error: callers keep a fallback.
 */
export async function fetchDrivingRoute(stops: LngLat[]): Promise<DrivingRoute | null> {
  if (!mapboxToken || stops.length < 2) return null;
  const coords = stops.map(([lng, lat]) => `${lng.toFixed(6)},${lat.toFixed(6)}`).join(';');
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${mapboxToken}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    return parseRoute(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
