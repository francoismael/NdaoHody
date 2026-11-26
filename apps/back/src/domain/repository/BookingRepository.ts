import type { StatutReservation } from '@contract';
import type { Booking, BookingChanges, NewBooking } from '../entity/Booking';

export abstract class BookingRepository {
  abstract create(booking: NewBooking): Promise<Booking>;

  abstract findById(id: number): Promise<Booking | null>;

  /** Bookings of a passenger, newest first. */
  abstract listByPassenger(passagerId: number): Promise<Booking[]>;

  /** Requests waiting for this driver's answer, oldest first. */
  abstract listWaitingForDriver(chauffeurId: number): Promise<Booking[]>;

  /** Bookings of a trip in one of these statuses. */
  abstract listOnTrip(trajetId: number, statuts: readonly StatutReservation[]): Promise<Booking[]>;

  /** The passenger's booking still in progress on this trip, if any. */
  abstract findActive(trajetId: number, passagerId: number): Promise<Booking | null>;

  /**
   * Changes a booking only if it is still in one of `from` (checked by the database, in one statement):
   * null when someone else changed it first (two answers at the same time).
   */
  abstract transition(id: number, from: readonly StatutReservation[], changes: BookingChanges): Promise<Booking | null>;

  /** Waiting requests past their deadline become "expiree"; returns them. */
  abstract expireDue(now: Date): Promise<Booking[]>;

  /** How many times this request was re-sent (length of its relance_de chain). */
  abstract countRetries(id: number): Promise<number>;
}
