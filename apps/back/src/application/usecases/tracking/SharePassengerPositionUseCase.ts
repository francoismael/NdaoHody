import { Injectable } from '@nestjs/common';
import type { Position, PositionPassager } from '@contract';
import type { User } from '../../../domain/entity/User';
import { DomainException } from '../../../domain/exception/DomainException';
import { BookingRepository } from '../../../domain/repository/BookingRepository';
import { TripRepository } from '../../../domain/repository/TripRepository';
import { assertInMadagascar } from '../../helper/geoRules';
import { Clock } from '../../port/Clock';
import { RealtimePublisher } from '../../port/RealtimePublisher';

/**
 * WebSocket "passenger-position": while the driver comes, his passenger's position is sent to him only.
 * Never stored: it only lives while the two are about to meet.
 */
@Injectable()
export class SharePassengerPositionUseCase {
  constructor(
    private readonly bookings: BookingRepository,
    private readonly trips: TripRepository,
    private readonly realtime: RealtimePublisher,
    private readonly clock: Clock,
  ) {}

  async execute(passenger: User, reservationId: number, position: Position): Promise<void> {
    assertInMadagascar(position);
    const booking = await this.bookings.findById(reservationId);
    if (!booking || booking.passagerId !== passenger.id) {
      throw new DomainException('not_found', 'Réservation introuvable.');
    }
    if (booking.statut !== 'acceptee' && booking.statut !== 'chauffeur_sur_place') {
      throw new DomainException('conflict', 'Ta position est partagée seulement pendant que le chauffeur vient te chercher.');
    }
    const trip = await this.trips.findById(booking.trajetId);
    if (!trip) {
      throw new DomainException('not_found', 'Réservation introuvable.');
    }

    const update: PositionPassager = { reservationId, ...position, dateMiseAJour: this.clock.now().toISOString() };
    this.realtime.toUser(trip.chauffeurId, 'passenger-position', update);
  }
}
