import { Injectable, Logger } from '@nestjs/common';
import { CANCELLABLE_STATUSES, type Booking } from '../../domain/entity/Booking';
import type { Trip } from '../../domain/entity/Trip';
import { BookingRepository } from '../../domain/repository/BookingRepository';
import { TripRepository } from '../../domain/repository/TripRepository';
import { notifyBestEffort } from '../helper/bestEffort';
import { toReservation } from '../helper/rideViews';
import { Clock } from '../port/Clock';
import { RealtimePublisher } from '../port/RealtimePublisher';
import { UnitOfWork } from '../port/UnitOfWork';
import { UserNotifier } from '../port/UserNotifier';

export type CancelledBy = 'chauffeur' | 'systeme';

/**
 * Cancels a trip and every booking not yet on board, then tells the passengers.
 * Used by the driver (POST /trips/:id/cancel) and by the job that cancels the trips that never left.
 */
@Injectable()
export class TripCancellationService {
  private readonly logger = new Logger(TripCancellationService.name);

  constructor(
    private readonly trips: TripRepository,
    private readonly bookings: BookingRepository,
    private readonly notifier: UserNotifier,
    private readonly realtime: RealtimePublisher,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async cancel(trip: Trip, by: CancelledBy): Promise<Trip> {
    const now = this.clock.now();
    const { cancelled, passengers, bookings } = await this.unitOfWork.run(async () => {
      const ongoing = await this.bookings.listOnTrip(trip.id, CANCELLABLE_STATUSES);
      const passengerIds: number[] = [];
      const cancelledBookings: Booking[] = [];
      for (const booking of ongoing) {
        const done = await this.bookings.transition(booking.id, CANCELLABLE_STATUSES, {
          statut: 'annulee_chauffeur',
          dateAnnulation: now.toISOString(),
        });
        if (done) {
          passengerIds.push(booking.passagerId);
          cancelledBookings.push(done);
        }
      }
      // The seats of a cancelled trip no longer matter: no need to give them back one by one.
      const updated = await this.trips.update(trip.id, { statut: 'annule', dateAnnulation: now.toISOString() });
      return { cancelled: updated, passengers: passengerIds, bookings: cancelledBookings };
    });

    for (const booking of bookings) {
      this.realtime.toUser(booking.passagerId, 'booking-updated', toReservation(booking));
    }
    const message =
      by === 'chauffeur'
        ? 'Le chauffeur a annulé son trajet. Cherche un autre chauffeur.'
        : "Le chauffeur n'est pas parti : le trajet est annulé. Cherche un autre chauffeur.";
    await Promise.all(
      passengers.map((utilisateurId) =>
        notifyBestEffort(this.logger, this.notifier, {
          utilisateurId,
          type: 'trajet_annule',
          titre: 'Trajet annulé',
          message,
          donnees: { trajetId: trip.id },
        }),
      ),
    );
    return cancelled;
  }
}

