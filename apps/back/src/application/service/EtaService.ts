import { Injectable } from '@nestjs/common';
import type { Position } from '@contract';
import { haversineMeters, positionKey } from '../../domain/entity/geo';
import { SECOND_MS } from '../helper/durations';
import { Clock } from '../port/Clock';
import { RouteProvider } from '../port/RouteProvider';

/** A fresh answer is reused this long, whatever the driver did. */
export const ETA_CACHE_SECONDS = 30;
/** After 30 s, a new route is asked only if the driver moved at least this much... */
export const ETA_MIN_MOVE_METRES = 100;
/** ...or if the answer is this old (a driver stuck in traffic still gets a fresh time). */
export const ETA_MAX_AGE_SECONDS = 5 * 60;
const MAX_CACHED = 2000;

interface CachedEta {
  driverPosition: Position;
  minutes: number;
  computedAt: Date;
}

/**
 * Minutes for a driver to reach a point (pickup point, passenger...), by the road.
 * Positions arrive every 5 s: without this cache, every screen refresh would cost a Mapbox call.
 */
@Injectable()
export class EtaService {
  private readonly cache = new Map<string, CachedEta>();

  constructor(
    private readonly routes: RouteProvider,
    private readonly clock: Clock,
  ) {}

  async minutesUntil(driverId: number, driverPosition: Position, target: Position): Promise<number> {
    const key = `${driverId}|${positionKey(target)}`;
    const now = this.clock.now();
    const cached = this.cache.get(key);
    if (cached && this.isStillGood(cached, driverPosition, now)) {
      return cached.minutes;
    }

    const route = await this.routes.route([driverPosition, target]);
    const minutes = Math.max(1, Math.ceil(route.dureeSecondes / 60));
    this.remember(key, { driverPosition, minutes, computedAt: now });
    return minutes;
  }

  private isStillGood(cached: CachedEta, driverPosition: Position, now: Date): boolean {
    const ageSeconds = (now.getTime() - cached.computedAt.getTime()) / SECOND_MS;
    if (ageSeconds < ETA_CACHE_SECONDS) {
      return true;
    }
    return ageSeconds < ETA_MAX_AGE_SECONDS && haversineMeters(cached.driverPosition, driverPosition) < ETA_MIN_MOVE_METRES;
  }

  private remember(key: string, eta: CachedEta): void {
    this.cache.delete(key);
    this.cache.set(key, eta);
    if (this.cache.size > MAX_CACHED) {
      // A Map keeps insertion order: the first key is the oldest.
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }
  }
}
