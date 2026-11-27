import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { bestEffort } from '../../application/helper/bestEffort';
import { SECOND_MS } from '../../application/helper/durations';
import {
  BOOKING_JOB_EVERY_SECONDS,
  POSITION_JOB_EVERY_SECONDS,
  RunRideJobsUseCase,
  TRIP_JOB_EVERY_SECONDS,
} from '../../application/usecases/jobs/RunRideJobsUseCase';

/**
 * Runs the background jobs of the rides while the API is up.
 * A run never starts while the previous one of the same job is still going.
 * With several API servers later, only one of them should run the jobs (lock in the database).
 */
@Injectable()
export class RideJobsScheduler implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger('RideJobs');
  private readonly timers: NodeJS.Timeout[] = [];
  private readonly running = new Set<string>();

  constructor(private readonly jobs: RunRideJobsUseCase) {}

  onApplicationBootstrap(): void {
    this.every('bookings', BOOKING_JOB_EVERY_SECONDS, () => this.jobs.expireBookings());
    this.every('positions', POSITION_JOB_EVERY_SECONDS, () => this.jobs.markDriversOffline());
    this.every('trips', TRIP_JOB_EVERY_SECONDS, () => this.jobs.handleTrips());
  }

  onApplicationShutdown(): void {
    this.timers.forEach(clearInterval);
  }

  private every(name: string, seconds: number, job: () => Promise<unknown>): void {
    const run = async (): Promise<void> => {
      if (this.running.has(name)) {
        return;
      }
      this.running.add(name);
      await bestEffort(this.logger, `Job "${name}" failed`, job());
      this.running.delete(name);
    };
    this.timers.push(setInterval(() => void run(), seconds * SECOND_MS));
  }
}
