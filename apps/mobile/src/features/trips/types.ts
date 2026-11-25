import type { Quartier, Trajet } from '@contract';

/** POST /trips. `dateDepart` only for a planned trip (immediate = now). */
export type PublishTripInput = Pick<
  Trajet,
  'type' | 'depart' | 'arrivee' | 'chemin' | 'distanceMetres' | 'dureeSecondes' | 'placesTotal' | 'reserveFemmes'
> & { dateDepart?: string };

/**
 * GET /routes?departId=&arriveeId= : the road between two places, computed by the server.
 * GAP #8 (to send to the backend): no route for places nor itineraries in data-objets.ts yet.
 * Today: cut from the pre-recorded Mapbox itineraries. Tomorrow: the API computes it.
 */
export type RoutePreview = Pick<Trajet, 'depart' | 'arrivee' | 'chemin' | 'distanceMetres' | 'dureeSecondes'>;

/** A place the driver can leave from or go to (contract `Quartier`). */
export type Place = Quartier;
