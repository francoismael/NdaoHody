import { Injectable } from '@nestjs/common';
import type { PositionChauffeur, SuiviReservation } from '@contract';
import type { User } from '../../../domain/entity/User';
import { DomainException } from '../../../domain/exception/DomainException';
import { BookingRepository } from '../../../domain/repository/BookingRepository';
import { DriverPositionRepository } from '../../../domain/repository/DriverPositionRepository';
import { TripRepository } from '../../../domain/repository/TripRepository';
import { UserRepository } from '../../../domain/repository/UserRepository';
import { VehicleRepository } from '../../../domain/repository/VehicleRepository';
import { toPublicProfile, toReservation } from '../../helper/rideViews';
import { TRACKED_STATUSES, TrackingService } from '../../service/TrackingService';

const BOOKING_NOT_FOUND_MESSAGE = 'Réservation introuvable.';

/**
 * GET /reservations/:id/tracking: the whole tracking screen at once (when the app opens,
 * or when the WebSocket cannot connect). For the passenger and his driver only, once accepted:
 * from then on each one sees the other's phone number.
 */
@Injectable()
export class GetTrackingUseCase {
  constructor(
    private readonly bookings: BookingRepository,
    private readonly trips: TripRepository,
    private readonly users: UserRepository,
    private readonly vehicles: VehicleRepository,
    private readonly positions: DriverPositionRepository,
    private readonly tracking: TrackingService,
  ) {}

  async execute(user: User, reservationId: number): Promise<SuiviReservation> {
    const booking = await this.bookings.findById(reservationId);
    const trip = booking && (await this.trips.findById(booking.trajetId));
    if (!booking || !trip || (booking.passagerId !== user.id && trip.chauffeurId !== user.id)) {
      throw new DomainException('not_found', BOOKING_NOT_FOUND_MESSAGE);
    }
    if (!(TRACKED_STATUSES as readonly string[]).includes(booking.statut)) {
      throw new DomainException('conflict', 'Le suivi commence quand le chauffeur accepte ta demande.');
    }

    const [driver, passenger, vehicle, saved] = await Promise.all([
      this.users.findById(trip.chauffeurId),
      this.users.findById(booking.passagerId),
      this.vehicles.findById(trip.vehiculeId),
      this.positions.findByDriver(trip.chauffeurId),
    ]);
    if (!driver || !passenger || !vehicle) {
      throw new DomainException('not_found', BOOKING_NOT_FOUND_MESSAGE);
    }

    // No position yet: the driver is shown at the start of his trip, as offline.
    const positionChauffeur: PositionChauffeur = saved ?? {
      chauffeurId: driver.id,
      trajetId: trip.id,
      latitude: trip.depart.latitude,
      longitude: trip.depart.longitude,
      enLigne: false,
      dateMiseAJour: trip.dateDepart,
    };
    const update = await this.tracking.update(trip, booking, positionChauffeur);

    return {
      reservation: toReservation(booking),
      trajet: trip,
      chauffeur: { ...toPublicProfile(driver), telephone: driver.telephone },
      passager: { ...toPublicProfile(passenger), telephone: passenger.telephone },
      vehicule: vehicle,
      positionChauffeur,
      cheminVersPassager: update.cheminVersPassager,
      arriveeDansMinutes: update.arriveeDansMinutes ?? 0,
      distanceMetres: update.distanceMetres,
    };
  }
}
