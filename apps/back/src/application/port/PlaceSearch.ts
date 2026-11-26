import type { Lieu, Position } from '@contract';

export interface PlaceSuggestion {
  /** Give it back to `retrieve` to get the coordinates. */
  id: string;
  nom: string;
  /** Neighbourhood, town... shown under the name. */
  detail: string | null;
}

/**
 * Port: place names (Mapbox Search Box and Geocoding today).
 * A search is billed per session: the same `session` from the first key typed to the chosen place.
 * Throws a DomainException 'unavailable' when the service does not answer.
 */
export abstract class PlaceSearch {
  /** Places matching what the user types, `near` first, in Madagascar only. */
  abstract suggest(text: string, session: string, near: Position | null): Promise<PlaceSuggestion[]>;

  /** Coordinates of a chosen suggestion; null when it no longer exists. */
  abstract retrieve(id: string, session: string): Promise<Lieu | null>;

  /** Name of the AREA at a point (neighbourhood, else locality, else town), never a building; null if unknown. */
  abstract areaName(position: Position): Promise<string | null>;
}
