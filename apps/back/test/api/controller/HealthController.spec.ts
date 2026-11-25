import { ServiceUnavailableException } from '@nestjs/common';
import { HealthStatus } from '../../../src/application/port/HealthChecker';
import { HealthController } from '../../../src/api/controller/HealthController';

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
