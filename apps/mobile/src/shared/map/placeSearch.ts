import { isRecord } from '@/shared/utils';

import type { LngLat } from './geo';
import { mapboxToken } from './token';

/**
 * Mapbox Search Box API (suggest, then retrieve), the API made for a search bar with
 * suggestions (POIs included, unlike Geocoding v6). Billed per session: one session token
 * per search, from the first keystroke to the chosen place. Knows nothing about carpooling.
 */

const BASE_URL = 'https://api.mapbox.com/search/searchbox/v1';
const TIMEOUT_MS = 8000;
const SUGGESTION_LIMIT = 6;

export type PlaceSuggestion = {
  /** Pass it to `retrievePlace` to get the coordinates. */
  mapboxId: string;
  name: string;
  /** Neighbourhood, city… shown under the name. */
  detail: string | null;
};

export type FoundPlace = { name: string; coordinate: LngLat };

export type SearchOptions = {
  sessionToken: string;
  /** Results near this point first (e.g. Antananarivo). */
  proximity?: LngLat;
  /** ISO 3166-1 alpha-2, e.g. "mg". */
  country?: string;
  signal?: AbortSignal;
};

/** A UUID v4 for the session (not a secret: only groups the calls for billing). */
export function newSearchSession(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r % 4) + 8).toString(16);
  });
}

/** Thrown when Mapbox cannot be reached (no token, no network, error): callers fall back. */
export class PlaceSearchUnavailable extends Error {}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  if (!mapboxToken) throw new PlaceSearchUnavailable('No Mapbox token');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const abort = (): void => controller.abort();
  signal?.addEventListener('abort', abort);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new PlaceSearchUnavailable(`Mapbox search: HTTP ${response.status}`);
    return (await response.json()) as unknown;
  } catch (error) {
    if (error instanceof PlaceSearchUnavailable) throw error;
    throw new PlaceSearchUnavailable(error instanceof Error ? error.message : 'Mapbox search failed');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

/** Query string by hand: React Native's URLSearchParams is only partly implemented. */
const query = (params: Record<string, string | undefined>): string =>
  Object.entries(params)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value : null);

function parseSuggestions(json: unknown): PlaceSuggestion[] {
  if (!isRecord(json) || !Array.isArray(json.suggestions)) return [];
  return json.suggestions.flatMap((item: unknown): PlaceSuggestion[] => {
    if (!isRecord(item)) return [];
    const mapboxId = text(item.mapbox_id);
    const name = text(item.name);
    if (!mapboxId || !name) return [];
    return [{ mapboxId, name, detail: text(item.place_formatted) ?? text(item.full_address) }];
  });
}

function parseRetrieved(json: unknown): FoundPlace | null {
  if (!isRecord(json) || !Array.isArray(json.features)) return null;
  const feature: unknown = json.features[0];
  if (!isRecord(feature) || !isRecord(feature.geometry) || !isRecord(feature.properties)) return null;
  const coordinates: unknown = feature.geometry.coordinates;
  if (!Array.isArray(coordinates) || typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number') return null;
  return { name: text(feature.properties.name) ?? '', coordinate: [coordinates[0], coordinates[1]] };
}

/** Area names only, most precise first (a building or a shop is never returned). */
const AREA_TYPES = 'neighborhood,locality,place';

/**
 * Name of the area at `coordinate` (neighbourhood, else locality, else town), for a point
 * touched on the map. Mapbox Geocoding v6 reverse: it has no POIs, so never a building.
 * Billed per request. null when Mapbox knows no area there.
 */
export async function areaNameAt(coordinate: LngLat, signal?: AbortSignal): Promise<string | null> {
  const params = query({
    longitude: String(coordinate[0]),
    latitude: String(coordinate[1]),
    types: AREA_TYPES,
    language: 'fr',
    access_token: mapboxToken ?? '',
  });
  const json = await getJson(`https://api.mapbox.com/search/geocode/v6/reverse?${params}`, signal);
  if (!isRecord(json) || !Array.isArray(json.features)) return null;
  const feature: unknown = json.features[0];
  return isRecord(feature) && isRecord(feature.properties) ? text(feature.properties.name) : null;
}

/** Suggestions while the user types (call it after a short pause, not on every key). */
export async function suggestPlaces(search: string, { sessionToken, proximity, country, signal }: SearchOptions): Promise<PlaceSuggestion[]> {
  const params = query({
    q: search,
    language: 'fr',
    limit: String(SUGGESTION_LIMIT),
    session_token: sessionToken,
    proximity: proximity ? `${proximity[0]},${proximity[1]}` : undefined,
    country,
    access_token: mapboxToken ?? '',
  });
  return parseSuggestions(await getJson(`${BASE_URL}/suggest?${params}`, signal));
}

/** Coordinates of the chosen suggestion (ends the session). */
export async function retrievePlace(mapboxId: string, sessionToken: string): Promise<FoundPlace> {
  const params = query({ session_token: sessionToken, access_token: mapboxToken ?? '' });
  const found = parseRetrieved(await getJson(`${BASE_URL}/retrieve/${encodeURIComponent(mapboxId)}?${params}`));
  if (!found) throw new PlaceSearchUnavailable('Mapbox retrieve: no coordinates');
  return found;
}
