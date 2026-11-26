import type { Chemin, Lieu, Position, Quartier, ResultatRecherche, Trajet } from '@contract';

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

/** What every driver card shows, at home and in the search: the trip, the driver, his vehicle. */
export type DriverCardData = Pick<ResultatRecherche, 'trajet' | 'chauffeur' | 'vehicule'>;

/**
 * What the passenger asked in the search form, kept as he chose it (prefilled when he edits).
 * `fromCurrent`: "my position" (the known place nearest the demo position);
 * `later`: null = now, else the wanted time (ms, demo clock).
 */
export type SearchCriteria = {
  fromCurrent: boolean;
  depart: ChosenPlace;
  destination: ChosenPlace;
  places: number;
  later: number | null;
};

/**
 * GET /trips/around: a driver on the road who will pass near the passenger, soonest first.
 * GAP #9 (to send to the backend): no "drivers passing near me" route in data-objets.ts yet;
 * the fields reuse ResultatRecherche and SuiviReservation.
 */
export type PassingDriver = Pick<ResultatRecherche, 'trajet' | 'chauffeur' | 'vehicule' | 'priseEnCharge'> & {
  /** Road time to the pickup point, on the demo clock (at least 1). */
  arriveeDansMinutes: number;
  positionChauffeur: Position;
  /** The driver's road to the pickup point. */
  cheminVersPassager: Chemin;
};
