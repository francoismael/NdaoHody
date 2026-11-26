import { Injectable, Logger } from '@nestjs/common';
import type { Reservation } from '@contract';
import type { Booking } from '../../../domain/entity/Booking';
import type { Trip } from '../../../domain/entity/Trip';
import type { User } from '../../../domain/entity/User';
import { DomainException } from '../../../domain/exception/DomainException';
import { BookingRepository } from '../../../domain/repository/BookingRepository';
import { ConversationRepository } from '../../../domain/repository/ConversationRepository';
import { TripRepository } from '../../../domain/repository/TripRepository';
import { notifyBestEffort } from '../../helper/bestEffort';
import { toReservation } from '../../helper/rideViews';
import { Clock } from '../../port/Clock';
import { UnitOfWork } from '../../port/UnitOfWork';
import { UserNotifier } from '../../port/UserNotifier';

const ALREADY_ANSWERED_MESSAGE = 'Cette demande a déjà une réponse.';
const NO_SEATS_MESSAGE = 'Plus assez de places libres sur ton trajet.';

/**
 * POST /reservations/:id/accept and /refuse: the driver answers within 3 minutes.
 * Accepting changes the booking AND takes the seats in one transaction, each in one statement checked
 * by the database: two answers at the same time on the last seat -> only one succeeds.
 */
@Injectable()
export class AnswerBookingUseCase {
  private readonly logger = new Logger(AnswerBookingUseCase.name);

  constructor(
    private readonly bookings: BookingRepository,
    private readonly trips: TripRepository,
    private readonly conversations: ConversationRepository,
    private readonly notifier: UserNotifier,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async accept(driver: User, bookingId: number): Promise<Reservation> {
    const { booking, trip } = await this.findWaiting(driver, bookingId);
    const now = this.clock.now();

    const accepted = await this.unitOfWork.run(async () => {
      const changed = await this.bookings.transition(booking.id, ['en_attente'], { statut: 'acceptee', dateReponse: now.toISOString() });
      if (!changed) {
        throw new DomainException('conflict', ALREADY_ANSWERED_MESSAGE);
      }
      if (!(await this.trips.takeSeats(trip.id, booking.places))) {
        throw new DomainException('conflict', NO_SEATS_MESSAGE); // rollback: the request stays waiting
      }
      await this.conversations.openFor(booking.id);
      return changed;
    });

    await notifyBestEffort(this.logger, this.notifier, {
      utilisateurId: booking.passagerId,
      type: 'demande_acceptee',
      titre: 'Demande acceptée',
      message: `${driver.prenom ?? 'Le chauffeur'} a accepté ta demande. Il vient te chercher.`,
      donnees: { reservationId: booking.id, trajetId: trip.id },
    });
    return toReservation(accepted);
  }

  async refuse(driver: User, bookingId: number, motif: string): Promise<Reservation> {
    const { booking, trip } = await this.findWaiting(driver, bookingId);
    const refused = await this.bookings.transition(booking.id, ['en_attente'], {
      statut: 'refusee',
      dateReponse: this.clock.now().toISOString(),
      motifRefus: motif,
    });
    if (!refused) {
      throw new DomainException('conflict', ALREADY_ANSWERED_MESSAGE);
    }

    await notifyBestEffort(this.logger, this.notifier, {
      utilisateurId: booking.passagerId,
      type: 'demande_refusee',
      titre: 'Demande refusée',
      message: `Motif : ${motif}. Cherche un autre chauffeur.`,
      donnees: { reservationId: booking.id, trajetId: trip.id },
    });
    return toReservation(refused);
  }

  /** Only the trip's driver answers, and only a request still waiting and not expired. */
  private async findWaiting(driver: User, bookingId: number): Promise<{ booking: Booking; trip: Trip }> {
    const booking = await this.bookings.findById(bookingId);
    const trip = booking && (await this.trips.findById(booking.trajetId));
    if (!booking || !trip || trip.chauffeurId !== driver.id) {
      throw new DomainException('not_found', 'Demande introuvable.');
    }
    if (booking.statut === 'expiree' || (booking.statut === 'en_attente' && new Date(booking.dateExpiration) <= this.clock.now())) {
      throw new DomainException('conflict', 'Cette demande a expiré : le passager peut la relancer.');
    }
    if (booking.statut !== 'en_attente') {
      throw new DomainException('conflict', ALREADY_ANSWERED_MESSAGE);
    }
    return { booking, trip };
  }
}
