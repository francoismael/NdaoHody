import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthChecker, HealthStatus } from '../../application/port/health-checker';

/**
 * GET /api/health
 * 200 { "postgres": "ok", "mongodb": "ok" } when both databases respond,
 * 503 with the same object when one of them does not.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthChecker: HealthChecker) {}

  @Get()
  async check(): Promise<HealthStatus> {
    const status = await this.healthChecker.check();
    if (status.postgres !== 'ok' || status.mongodb !== 'ok') {
      throw new ServiceUnavailableException(status);
    }
    return status;
  }
}
