import type { Chemin } from '@contract';

import { densify, fetchDrivingRoute, pathLengthMeters, thinPath, type LngLat } from '@/shared/map';
import { readJson, writeJson } from '@/shared/storage';
import { isRecord } from '@/shared/utils';

import { ITINERARIES, ITINERARY_KEYS, type ItineraryKey } from './itineraries';
import { PLACES } from './places';

export interface StoredRoute {
  chemin: Chemin;
  distanceMetres: number;
  dureeSecondes: number;
  /** 'mapbox' = real roads; 'draft' = straight lines (no network at first launch). */
  source: 'mapbox' | 'draft';
}

/** Kept apart from the mock database: a demo reset never throws real roads away. */
const ROUTES_KEY = 'ndaohody:mock-routes';
const DRAFT_DETOUR = 1.25; // straight line -> road distance
const DRAFT_SPEED_MS = 5.5; // ~20 km/h in Tana traffic
/** Keeps the saved database well under Android's ~2 MB per-entry limit. */
const MIN_POINT_STEP_M = 20;

let cache: Partial<Record<ItineraryKey, StoredRoute>> = {};

const stopsOf = (key: ItineraryKey): LngLat[] =>
  ITINERARIES[key].map((place) => [PLACES[place].longitude, PLACES[place].latitude]);

function draftRoute(key: ItineraryKey): StoredRoute {
  const chemin = densify(stopsOf(key), 100);
  const distanceMetres = Math.round(pathLengthMeters(chemin) * DRAFT_DETOUR);
  return { chemin, distanceMetres, dureeSecondes: Math.round(distanceMetres / DRAFT_SPEED_MS), source: 'draft' };
}

const isStoredRoute = (value: unknown): value is StoredRoute =>
  isRecord(value) && Array.isArray(value.chemin) && typeof value.distanceMetres === 'number' && value.source === 'mapbox';

export async function loadRouteCache(): Promise<void> {
  const stored = await readJson(ROUTES_KEY);
  if (!isRecord(stored)) return;
  ITINERARY_KEYS.forEach((key) => {
    const entry = stored[key];
    if (isStoredRoute(entry)) cache[key] = entry;
  });
}

/** Asks Mapbox for every itinerary not yet on real roads. Silent if offline. */
export async function fetchMissingRoutes(): Promise<void> {
  const missing = ITINERARY_KEYS.filter((key) => cache[key]?.source !== 'mapbox');
  if (missing.length === 0) return;
  const results = await Promise.all(missing.map((key) => fetchDrivingRoute(stopsOf(key))));
  results.forEach((route, i) => {
    if (route) {
      cache[missing[i]] = {
        chemin: thinPath(route.coordinates, MIN_POINT_STEP_M),
        distanceMetres: route.distanceMeters,
        dureeSecondes: route.durationSeconds,
        source: 'mapbox',
      };
    }
  });
  await writeJson(ROUTES_KEY, cache);
}

/** Real road path when known, otherwise the draft. */
export const getRoute = (key: ItineraryKey): StoredRoute => cache[key] ?? draftRoute(key);

/** For tests: forget every cached road. */
export function clearRouteCacheInMemory(): void {
  cache = {};
}
