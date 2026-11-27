import { Injectable } from '@nestjs/common';
import type { Position } from '@contract';
import type { User } from '../../../domain/entity/User';
import { BookingRepository } from '../../../domain/repository/BookingRepository';
import { DriverPositionRepository } from '../../../domain/repository/DriverPositionRepository';
import { TripRepository } from '../../../domain/repository/TripRepository';
import { assertInMadagascar } from '../../helper/geoRules';
import { Clock } from '../../port/Clock';
import { RealtimePublisher } from '../../port/RealtimePublisher';
import { TRACKED_STATUSES, TrackingService } from '../../service/TrackingService';

/**
 * The driver's phone sends its position every 5 s (WebSocket "driver-position", or POST /me/position).
 * It is saved (search, 2-minute offline rule), then each passenger of the trip and the driver
 * receive "tracking-update": position, road to the pickup point, minutes before arrival.
 */
@Injectable()
export class ShareDriverPositionUseCase {
  constructor(
    private readonly trips: TripRepository,
    private readonly bookings: BookingRepository,
    private readonly positions: DriverPositionRepository,
    private readonly tracking: TrackingService,
    private readonly realtime: RealtimePublisher,
    private readonly clock: Clock,
  ) {}

  async execute(driver: User, position: Position): Promise<void> {
    assertInMadagascar(position);
    const trip = await this.trips.findOnTheRoad(driver.id);
    // Without a trip on the road, the driver is not offered to passengers.
    await this.positions.save(driver.id, trip?.id ?? null, position, trip !== null, this.clock.now());
    if (!trip) {
      return;
    }

    const followed = await this.bookings.listOnTrip(trip.id, TRACKED_STATUSES);
    for (const booking of followed) {
      const update = await this.tracking.update(trip, booking, position);
      this.realtime.toUser(booking.passagerId, 'tracking-update', update);
      this.realtime.toUser(driver.id, 'tracking-update', update);
    }
  }
}
