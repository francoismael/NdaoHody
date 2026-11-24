import { ServiceUnavailableException } from '@nestjs/common';
import { HealthStatus } from '../../application/port/health-checker';
import { HealthController } from './health.controller';

function controllerWith(status: HealthStatus): HealthController {
  return new HealthController({ check: async () => status });
}

describe('HealthController', () => {
  it('returns ok when both databases respond', async () => {
    const controller = controllerWith({ postgres: 'ok', mongodb: 'ok' });
    await expect(controller.check()).resolves.toEqual({ postgres: 'ok', mongodb: 'ok' });
  });

  it('returns 503 when MongoDB does not respond', async () => {
    const controller = controllerWith({ postgres: 'ok', mongodb: 'error' });
    await expect(controller.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('returns 503 when PostgreSQL does not respond', async () => {
    const controller = controllerWith({ postgres: 'error', mongodb: 'ok' });
    await expect(controller.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
