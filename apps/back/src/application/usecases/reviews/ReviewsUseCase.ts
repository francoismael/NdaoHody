import { Injectable } from '@nestjs/common';
import type { Avis, AvisAvecAuteur, DemandeAvis } from '@contract';
import type { User } from '../../../domain/entity/User';
import { DomainException } from '../../../domain/exception/DomainException';
import { BookingRepository } from '../../../domain/repository/BookingRepository';
import { ReviewRepository } from '../../../domain/repository/ReviewRepository';
import { TripRepository } from '../../../domain/repository/TripRepository';
import { UserRepository } from '../../../domain/repository/UserRepository';
import { Clock } from '../../port/Clock';
import { UnitOfWork } from '../../port/UnitOfWork';
import { BadgeService } from '../../service/BadgeService';

/**
 * POST /reviews: only the passenger rates his driver (1 to 5, optional comment),
 * once, after a finished ride. The driver's average rating and badge are computed again.
 * GET /users/:id/reviews: reviews a user received, with each author's first name and photo.
 */
@Injectable()
export class ReviewsUseCase {
  constructor(
    private readonly reviews: ReviewRepository,
    private readonly bookings: BookingRepository,
    private readonly trips: TripRepository,
    private readonly users: UserRepository,
    private readonly badges: BadgeService,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async create(passenger: User, request: DemandeAvis): Promise<Avis> {
    const booking = await this.bookings.findById(request.reservationId);
    const trip = booking && (await this.trips.findById(booking.trajetId));
    if (!booking || !trip) {
      throw new DomainException('not_found', 'Course introuvable.');
    }
    if (booking.passagerId !== passenger.id) {
      throw new DomainException('forbidden', 'Seul le passager de cette course peut noter son chauffeur.');
    }
    if (booking.statut !== 'terminee') {
      throw new DomainException('conflict', 'Tu pourras noter ton chauffeur à la fin de la course.');
    }
    if (await this.reviews.findByBookingAndAuthor(booking.id, passenger.id)) {
      throw new DomainException('conflict', 'Tu as déjà noté cette course.');
    }

    const review = await this.unitOfWork.run(async () => {
      const created = await this.reviews.create({
        reservationId: booking.id,
        auteurId: passenger.id,
        cibleId: trip.chauffeurId,
        note: request.note,
        commentaire: request.commentaire?.trim() || null,
        dateAvis: this.clock.now().toISOString(),
      });
      await this.users.refreshRating(trip.chauffeurId);
      return created;
    });
    await this.badges.refresh(trip.chauffeurId);
    return review;
  }

  listReceived(userId: number): Promise<AvisAvecAuteur[]> {
    return this.reviews.listReceivedBy(userId);
  }
}
