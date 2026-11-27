import { Injectable, Logger } from '@nestjs/common';
import type { MiseAJourSuivi, Position } from '@contract';
import type { Booking } from '../../domain/entity/Booking';
import { haversineMeters } from '../../domain/entity/geo';
import type { Trip } from '../../domain/entity/Trip';
import { TripRepository } from '../../domain/repository/TripRepository';
import { describeError } from '../helper/bestEffort';
import { EtaService } from './EtaService';

/** Bookings followed live: the driver is coming (or the passenger is on board). */
export const TRACKED_STATUSES = ['acceptee', 'chauffeur_sur_place', 'en_course'] as const;

/**
 * What a passenger (and his driver) see while the driver comes: where the driver is,
 * the road he will take to the pickup point, and the minutes before he arrives.
 */
@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(
    private readonly trips: TripRepository,
    private readonly eta: EtaService,
  ) {}

  async update(trip: Trip, booking: Booking, driverPosition: Position): Promise<MiseAJourSuivi> {
    if (booking.statut === 'en_course') {
      // On board: only the position matters.
      return { reservationId: booking.id, positionChauffeur: driverPosition, cheminVersPassager: [], arriveeDansMinutes: null, distanceMetres: 0 };
    }

    const pickup = booking.priseEnCharge;
    const path = await this.trips.pathBetween(trip.id, driverPosition, pickup);
    return {
      reservationId: booking.id,
      positionChauffeur: driverPosition,
      cheminVersPassager: path?.chemin ?? [],
      arriveeDansMinutes: await this.minutesToPickup(trip, driverPosition, pickup, path?.distanceMetres ?? 0),
      distanceMetres: Math.round(haversineMeters(driverPosition, pickup)),
    };
  }

  /**
   * Mapbox (cached by EtaService). If the map service does not answer, the minutes are guessed from
   * the remaining road and the trip's average speed: the passenger always sees a number.
   */
  private async minutesToPickup(trip: Trip, driverPosition: Position, pickup: Position, roadMetres: number): Promise<number> {
    try {
      return await this.eta.minutesUntil(trip.chauffeurId, driverPosition, pickup);
    } catch (error) {
      this.logger.warn(`ETA from the road instead of Mapbox: ${describeError(error)}`);
      const metresPerSecond = trip.distanceMetres / Math.max(1, trip.dureeSecondes);
      return Math.max(1, Math.ceil(roadMetres / Math.max(1, metresPerSecond) / 60));
    }
  }
}
