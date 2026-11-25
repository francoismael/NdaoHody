import type { Trajet } from '@contract';

/** POST /trips. `dateDepart` only for a planned trip (immediate = now). */
export type PublishTripInput = Pick<
  Trajet,
  'type' | 'depart' | 'arrivee' | 'chemin' | 'distanceMetres' | 'dureeSecondes' | 'placesTotal' | 'reserveFemmes'
> & { dateDepart?: string };
