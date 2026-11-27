import { Injectable, Logger } from '@nestjs/common';
import type { Reservation } from '@contract';
import { CANCELLABLE_STATUSES, holdsSeats, PASSENGER_CANCELLABLE_STATUSES, type Booking } from '../../../domain/entity/Booking';
import type { Trip } from '../../../domain/entity/Trip';
import type { User } from '../../../domain/entity/User';
import { DomainException } from '../../../domain/exception/DomainException';
import { BookingRepository } from '../../../domain/repository/BookingRepository';
import { TripRepository } from '../../../domain/repository/TripRepository';
import { notifyBestEffort } from '../../helper/bestEffort';
import { toReservation } from '../../helper/rideViews';
import { Clock } from '../../port/Clock';
import { RealtimePublisher } from '../../port/RealtimePublisher';
import { UnitOfWork } from '../../port/UnitOfWork';
import { UserNotifier } from '../../port/UserNotifier';

const BOOKING_NOT_FOUND_MESSAGE = 'Demande introuvable.';

/** GET /me/reservations, GET /me/requests, GET /reservations/:id, GET .../refusal-reason, POST .../cancel. */
@Injectable()
export class ManageBookingsUseCase {
  private readonly logger = new Logger(ManageBookingsUseCase.name);

  constructor(
    private readonly bookings: BookingRepository,
    private readonly trips: TripRepository,
    private readonly notifier: UserNotifier,
    private readonly realtime: RealtimePublisher,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async listMine(passenger: User): Promise<Reservation[]> {
    return (await this.bookings.listByPassenger(passenger.id)).map(toReservation);
  }

  /** Requests waiting for this driver's answer. */
  async listRequests(driver: User): Promise<Reservation[]> {
    const now = this.clock.now();
    const waiting = await this.bookings.listWaitingForDriver(driver.id);
    return waiting.filter((booking) => new Date(booking.dateExpiration) > now).map(toReservation);
  }

  async get(user: User, bookingId: number): Promise<Reservation> {
    return toReservation((await this.findForParty(user, bookingId)).booking);
  }

  async refusalReason(user: User, bookingId: number): Promise<{ motif: string | null }> {
    return { motif: (await this.findForParty(user, bookingId)).booking.motifRefus };
  }

  /**
   * - The passenger cancels only BEFORE the driver's answer (rule of the app): once accepted, the driver is on his way.
   * - The driver can cancel a passenger until he gets in; the seats go back to the trip.
   */
  async cancel(user: User, bookingId: number): Promise<Reservation> {
    const { booking, trip } = await this.findForParty(user, bookingId);
    const byDriver = user.id === trip.chauffeurId;
    const allowed = byDriver ? CANCELLABLE_STATUSES : PASSENGER_CANCELLABLE_STATUSES;
    if (!allowed.includes(booking.statut)) {
      throw new DomainException(
        'conflict',
        byDriver ? 'Cette réservation ne peut plus être annulée.' : 'Tu ne peux plus annuler : le chauffeur a déjà répondu.',
      );
    }
    // Read before the change: once cancelled, the booking no longer "holds" its seats.
    const seatsToGiveBack = holdsSeats(booking) ? booking.places : 0;

    const cancelled = await this.unitOfWork.run(async () => {
      const changed = await this.bookings.transition(booking.id, allowed, {
        statut: byDriver ? 'annulee_chauffeur' : 'annulee_passager',
        dateAnnulation: this.clock.now().toISOString(),
      });
      if (!changed) {
        throw new DomainException('conflict', 'Cette réservation vient de changer. Recharge la page.');
      }
      if (seatsToGiveBack > 0) {
        await this.trips.releaseSeats(trip.id, seatsToGiveBack);
      }
      return changed;
    });

    this.realtime.toUser(byDriver ? booking.passagerId : trip.chauffeurId, 'booking-updated', toReservation(cancelled));
    await notifyBestEffort(this.logger, this.notifier, {
      utilisateurId: byDriver ? booking.passagerId : trip.chauffeurId,
      type: 'reservation_annulee',
      titre: 'Réservation annulée',
      message: byDriver ? 'Le chauffeur a annulé ta réservation. Cherche un autre chauffeur.' : 'Le passager a annulé sa réservation.',
      donnees: { reservationId: booking.id, trajetId: trip.id },
    });
    return toReservation(cancelled);
  }

  /** Only the passenger and the trip's driver see a booking. */
  private async findForParty(user: User, bookingId: number): Promise<{ booking: Booking; trip: Trip }> {
    const booking = await this.bookings.findById(bookingId);
    const trip = booking && (await this.trips.findById(booking.trajetId));
    if (!booking || !trip || (booking.passagerId !== user.id && trip.chauffeurId !== user.id)) {
      throw new DomainException('not_found', BOOKING_NOT_FOUND_MESSAGE);
    }
    return { booking, trip };
  }
}
