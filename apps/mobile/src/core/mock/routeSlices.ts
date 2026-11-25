import type { Lieu, Quartier } from '@contract';

import type { RoutePreview } from '@/features/trips/types';
import { haversineMeters, nearestPointIndex, pathLengthMeters, type LngLat } from '@/shared/map';

import { ITINERARIES, ITINERARY_KEYS } from './itineraries';
import { PLACES, type PlaceKey } from './places';
import { getRoute } from './routeCache';

/**
 * The places a driver can choose, and the road between two of them: a piece of a
 * pre-recorded itinerary (real roads, no network). Replaced by the API's routing later.
 */

const PLACE_KEYS = Object.keys(PLACES) as PlaceKey[];

const lngLatOf = (key: PlaceKey): LngLat => [PLACES[key].longitude, PLACES[key].latitude];

/** Contract `Quartier`: ids follow the order of PLACES (stable inside one demo). */
export const toQuartier = (key: PlaceKey): Quartier => ({
  id: PLACE_KEYS.indexOf(key) + 1,
  nom: PLACES[key].libelle,
  latitude: PLACES[key].latitude,
  longitude: PLACES[key].longitude,
});

export const placeKeyOf = (id: number): PlaceKey | null => PLACE_KEYS[id - 1] ?? null;

export const toLieuOf = (key: PlaceKey): Lieu => ({ ...PLACES[key] });

export const allPlaces = (): Quartier[] => PLACE_KEYS.map(toQuartier);

/** The known place closest to `point`, and how far it is. */
export function nearestPlace(point: LngLat): { key: PlaceKey; distanceMetres: number } {
  return PLACE_KEYS.map((key) => ({ key, distanceMetres: haversineMeters(lngLatOf(key), point) })).reduce((a, b) =>
    b.distanceMetres < a.distanceMetres ? b : a,
  );
}

/** Places reached after `from` on at least one itinerary, in itinerary order. */
export function destinationsFrom(from: PlaceKey): PlaceKey[] {
  const found = new Set<PlaceKey>();
  ITINERARY_KEYS.forEach((itinerary) => {
    const stops: readonly PlaceKey[] = ITINERARIES[itinerary];
    const start = stops.indexOf(from);
    if (start >= 0) stops.slice(start + 1).forEach((stop) => found.add(stop));
  });
  return [...found];
}

/** The shortest road from `from` to `to` along the itineraries, or null if none goes that way. */
export function routeBetween(from: PlaceKey, to: PlaceKey): RoutePreview | null {
  let best: RoutePreview | null = null;
  for (const itinerary of ITINERARY_KEYS) {
    const stops: readonly PlaceKey[] = ITINERARIES[itinerary];
    const a = stops.indexOf(from);
    const b = stops.indexOf(to);
    if (a < 0 || b <= a) continue;

    const route = getRoute(itinerary);
    const path = route.chemin;
    const start = nearestPointIndex(path, lngLatOf(from)).index;
    const end = start + nearestPointIndex(path.slice(start), lngLatOf(to)).index;
    if (end <= start) continue;

    const chemin = path.slice(start, end + 1);
    const total = pathLengthMeters(path);
    const share = total === 0 ? 0 : pathLengthMeters(chemin) / total;
    const candidate: RoutePreview = {
      depart: toLieuOf(from),
      arrivee: toLieuOf(to),
      chemin,
      distanceMetres: Math.round(route.distanceMetres * share),
      dureeSecondes: Math.round(route.dureeSecondes * share),
    };
    if (!best || candidate.distanceMetres < best.distanceMetres) best = candidate;
  }
  return best;
}
