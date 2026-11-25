import type { Reservation } from '@contract';

/** POST /reservations: what the passenger chose from a search result. */
export type CreateReservationInput = Pick<Reservation, 'trajetId' | 'places' | 'priseEnCharge' | 'depose'>;
