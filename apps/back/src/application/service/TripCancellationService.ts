import { Injectable, Logger } from '@nestjs/common';
import { CANCELLABLE_STATUSES } from '../../domain/entity/Booking';
import type { Trip } from '../../domain/entity/Trip';
import { BookingRepository } from '../../domain/repository/BookingRepository';
import { TripRepository } from '../../domain/repository/TripRepository';
import { notifyBestEffort } from '../helper/bestEffort';
import { Clock } from '../port/Clock';
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
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async cancel(trip: Trip, by: CancelledBy): Promise<Trip> {
    const now = this.clock.now();
    const { cancelled, passengers } = await this.unitOfWork.run(async () => {
      const ongoing = await this.bookings.listOnTrip(trip.id, CANCELLABLE_STATUSES);
      const passengerIds: number[] = [];
      for (const booking of ongoing) {
        const done = await this.bookings.transition(booking.id, CANCELLABLE_STATUSES, {
          statut: 'annulee_chauffeur',
          dateAnnulation: now.toISOString(),
        });
        if (done) {
          passengerIds.push(booking.passagerId);
        }
      }
      // The seats of a cancelled trip no longer matter: no need to give them back one by one.
      const updated = await this.trips.update(trip.id, { statut: 'annule', dateAnnulation: now.toISOString() });
      return { cancelled: updated, passengers: passengerIds };
    });

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

