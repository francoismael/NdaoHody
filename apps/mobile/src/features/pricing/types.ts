import type { Position, ResultatRecherche } from '@contract';

/** POST /pricing/estimate. Route not in data-objets.ts yet (gap #4, to confirm with the backend). */
export type PriceEstimate = {
  prixParPlace: number;
  prixTotal: number;
};

/**
 * POST /reservations/quote (same body as POST /reservations): the search result for THIS trip and
 * these points (driver, vehicle, when he passes, price), plus where the driver is now.
 * Pickup and drop come back moved onto the driver's path (as the back stores them): the app sends
 * those to POST /reservations.
 * GAP #15 (to send to the backend): the API prices a booking only when it is created.
 */
export type PriceQuote = ResultatRecherche & {
  /** Live car position; null for a trip not started yet. */
  positionChauffeur: Position | null;
};
