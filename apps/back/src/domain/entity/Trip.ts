import type { StatutTrajet, Trajet } from '@contract';

/** A trip published by a driver (table trajet). Same fields as the data object. */
export type Trip = Trajet;

export type NewTrip = Omit<Trip, 'id' | 'dateAnnulation' | 'dateFin'>;

export type TripChanges = Partial<Pick<Trip, 'statut' | 'dateDepart' | 'placesTotal' | 'placesLibres' | 'dateAnnulation' | 'dateFin'>>;

/** The driver is on the road (with or without passengers on board): only one such trip per driver. */
export const ON_THE_ROAD_STATUSES: readonly StatutTrajet[] = ['en_route', 'en_cours'];

/** Trips a passenger can still find and book. */
export const BOOKABLE_STATUSES: readonly StatutTrajet[] = ['publie', 'en_route', 'en_cours'];

export function isBookable(trip: Pick<Trip, 'statut'>): boolean {
  return BOOKABLE_STATUSES.includes(trip.statut);
}

/** End of the trip if it leaves on time. */
export function plannedArrival(trip: Pick<Trip, 'dateDepart' | 'dureeSecondes'>): Date {
  return new Date(new Date(trip.dateDepart).getTime() + trip.dureeSecondes * 1000);
}
