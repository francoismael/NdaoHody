import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiErrorResponse } from '../../application/dto/ApiErrorResponse';
import { HealthChecker, HealthStatus } from '../../application/port/HealthChecker';

/**
 * GET /api/health
 * 200 { "postgres": "ok", "mongodb": "ok" } when both databases respond,
 * 503 with the status of each database in "details" when one of them does not.
 */
@ApiTags('health')
@SkipThrottle() // called often by monitoring tools
@Controller('health')
export class HealthController {
  constructor(private readonly healthChecker: HealthChecker) {}

  @Get()
  @ApiOkResponse({ schema: { example: { postgres: 'ok', mongodb: 'ok' } } })
  @ApiServiceUnavailableResponse({ type: ApiErrorResponse })
  async check(): Promise<HealthStatus> {
    const status = await this.healthChecker.check();
    if (status.postgres !== 'ok' || status.mongodb !== 'ok') {
      throw new ServiceUnavailableException({ message: 'A database is not responding.', details: status });
    }
    return status;
  }
}
