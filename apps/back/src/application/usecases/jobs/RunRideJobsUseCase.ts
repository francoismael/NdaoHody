import { Injectable, Logger } from '@nestjs/common';
import type { Trip } from '../../../domain/entity/Trip';
import { BookingRepository } from '../../../domain/repository/BookingRepository';
import { DriverPositionRepository } from '../../../domain/repository/DriverPositionRepository';
import { TripRepository } from '../../../domain/repository/TripRepository';
import { notifyBestEffort } from '../../helper/bestEffort';
import { MINUTE_MS, SECOND_MS } from '../../helper/durations';
import { toReservation } from '../../helper/rideViews';
import { START_LATE_MINUTES } from '../../helper/tripRules';
import { Clock } from '../../port/Clock';
import { RealtimePublisher } from '../../port/RealtimePublisher';
import { UserNotifier } from '../../port/UserNotifier';
import { TripCancellationService } from '../../service/TripCancellationService';

/** How often each job runs (seconds). */
export const BOOKING_JOB_EVERY_SECONDS = 15;
export const POSITION_JOB_EVERY_SECONDS = 30;
export const TRIP_JOB_EVERY_SECONDS = 60;
/** Reminders before a planned departure. */
export const REMINDER_MINUTES = [60, 10] as const;
/** A driver without position for this long is offline: he disappears from the search. */
export const OFFLINE_AFTER_MINUTES = 2;

export const LOCATION_REQUIRED_MESSAGE =
  'Active ta localisation : sans ta position, les passagers ne te trouvent plus et ne te voient plus arriver.';

/**
 * Background work, started by the scheduler (infrastructure/scheduler):
 * - every 15 s: requests without answer after 3 min expire, passenger and driver are told;
 * - every 30 s: drivers without position for 2 min go offline (asked to turn their location on);
 * - every minute: reminders 1 h and 10 min before a planned trip, and planned trips
 *   still not started 30 min after their time are cancelled.
 */
@Injectable()
export class RunRideJobsUseCase {
  private readonly logger = new Logger(RunRideJobsUseCase.name);

  constructor(
    private readonly bookings: BookingRepository,
    private readonly trips: TripRepository,
    private readonly positions: DriverPositionRepository,
    private readonly cancellation: TripCancellationService,
    private readonly notifier: UserNotifier,
    private readonly realtime: RealtimePublisher,
    private readonly clock: Clock,
  ) {}

  async expireBookings(): Promise<number> {
    const expired = await this.bookings.expireDue(this.clock.now());
    for (const booking of expired) {
      const trip = await this.trips.findById(booking.trajetId);
      const reservation = toReservation(booking);
      this.realtime.toUser(booking.passagerId, 'booking-updated', reservation);
      if (trip) {
        // Removed from the driver's screen at once.
        this.realtime.toUser(trip.chauffeurId, 'booking-updated', reservation);
      }
      await notifyBestEffort(this.logger, this.notifier, {
        utilisateurId: booking.passagerId,
        type: 'demande_expiree',
        titre: 'Pas de réponse du chauffeur',
        message: 'Le chauffeur n’a pas répondu à temps. Relance-le ou cherche un autre chauffeur.',
        donnees: { reservationId: booking.id, trajetId: booking.trajetId },
      });
    }
    return expired.length;
  }

  async markDriversOffline(): Promise<number[]> {
    const before = new Date(this.clock.now().getTime() - OFFLINE_AFTER_MINUTES * MINUTE_MS);
    const offline = await this.positions.markStaleOffline(before);
    for (const driverId of offline) {
      if (await this.trips.findOnTheRoad(driverId)) {
        this.realtime.toUser(driverId, 'location-required', { message: LOCATION_REQUIRED_MESSAGE });
      }
    }
    return offline;
  }

  async handleTrips(): Promise<void> {
    const now = this.clock.now();
    for (const minutes of REMINDER_MINUTES) {
      // Each trip falls once in a window as long as the interval between two runs.
      const windowEnd = new Date(now.getTime() + minutes * MINUTE_MS);
      const windowStart = new Date(windowEnd.getTime() - TRIP_JOB_EVERY_SECONDS * SECOND_MS);
      const leaving = await this.trips.listPublishedLeavingBetween(windowStart, windowEnd);
      await Promise.all(leaving.map((trip) => this.remind(trip, minutes)));
    }

    const tooLate = new Date(now.getTime() - START_LATE_MINUTES * MINUTE_MS);
    for (const trip of await this.trips.listWithStatus('publie', tooLate)) {
      await this.cancellation.cancel(trip, 'systeme');
    }
  }

  private async remind(trip: Trip, minutes: number): Promise<void> {
    const when = minutes >= 60 ? `dans ${minutes / 60} h` : `dans ${minutes} min`;
    const passengers = await this.bookings.listOnTrip(trip.id, ['acceptee']);
    const people = [
      { utilisateurId: trip.chauffeurId, message: `Ton trajet part ${when}. Appuie sur « Je pars » au départ.` },
      ...passengers.map((booking) => ({ utilisateurId: booking.passagerId, message: `Ton trajet part ${when}.` })),
    ];
    await Promise.all(
      people.map(({ utilisateurId, message }) =>
        notifyBestEffort(this.logger, this.notifier, {
          utilisateurId,
          type: 'rappel_depart',
          titre: 'Rappel de départ',
          message,
          donnees: { trajetId: trip.id },
        }),
      ),
    );
  }
}
