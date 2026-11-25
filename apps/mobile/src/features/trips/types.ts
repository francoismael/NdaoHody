import type { Lieu, Quartier, Trajet } from '@contract';

/** POST /trips. `dateDepart` only for a planned trip (immediate = now). */
export type PublishTripInput = Pick<
  Trajet,
  'type' | 'depart' | 'arrivee' | 'chemin' | 'distanceMetres' | 'dureeSecondes' | 'placesTotal' | 'reserveFemmes'
> & { dateDepart?: string };

/**
 * The road between two places, its distance and duration.
 * GAP #8 (to send to the backend): no place search nor routing in data-objets.ts yet.
 * Today: Mapbox Directions called by the app (online), or a piece of a pre-recorded
 * itinerary between two known places (offline). Tomorrow: the API computes it.
 */
export type RoutePreview = Pick<Trajet, 'depart' | 'arrivee' | 'chemin' | 'distanceMetres' | 'dureeSecondes'>;

/** A known place of the dataset (contract `Quartier`): offline fallback and "my position". */
export type Place = Quartier;

/**
 * A departure or arrival chosen by the driver: any place found by the search
 * (`placeId` null) or a known place (`placeId` set: it has a recorded road, usable offline).
 */
export type ChosenPlace = Lieu & { placeId: number | null };

/** One line under the search bar: from Mapbox (coordinates fetched once chosen) or a known place. */
export type PlaceSuggestionItem = { key: string; name: string; detail: string | null } & (
  | { source: 'mapbox'; mapboxId: string }
  | { source: 'known'; place: ChosenPlace }
);
