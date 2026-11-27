import type { Reservation, StatutReservation } from '@contract';

/** A seat request on a trip (table reservation): the data object plus the refusal reason. */
export type Booking = Reservation & {
  /** Reason given by the driver when he refuses; shown to the passenger. */
  motifRefus: string | null;
};

export type NewBooking = Pick<
  Booking,
  | 'trajetId'
  | 'passagerId'
  | 'places'
  | 'distanceMetres'
  | 'prixParPlace'
  | 'prixTotal'
  | 'priseEnCharge'
  | 'depose'
  | 'relanceDe'
  | 'dateDemande'
  | 'dateExpiration'
>;

export type BookingChanges = Partial<
  Pick<
    Booking,
    | 'statut'
    | 'dateReponse'
    | 'dateAnnulation'
    | 'motifRefus'
    | 'dateSurPlace'
    | 'finAttente'
    | 'prolongations'
    | 'dateDebutCourse'
    | 'dateFinCourse'
  >
>;

/** Still in progress: one at most per passenger and trip (uq_reservation_une_active). */
export const ACTIVE_BOOKING_STATUSES: readonly StatutReservation[] = ['en_attente', 'acceptee', 'chauffeur_sur_place', 'en_course'];

/** The driver said yes: the seats are taken from the trip. */
export const SEAT_HOLDING_STATUSES: readonly StatutReservation[] = ['acceptee', 'chauffeur_sur_place', 'en_course'];

/** Can still be cancelled by the driver (or the system): the passenger is not on board yet. */
export const CANCELLABLE_STATUSES: readonly StatutReservation[] = ['en_attente', 'acceptee', 'chauffeur_sur_place'];

/** The passenger cancels only before the driver's answer. */
export const PASSENGER_CANCELLABLE_STATUSES: readonly StatutReservation[] = ['en_attente'];

export function holdsSeats(booking: Pick<Booking, 'statut'>): boolean {
  return SEAT_HOLDING_STATUSES.includes(booking.statut);
}
