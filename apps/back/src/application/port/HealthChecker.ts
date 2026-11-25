export type DatabaseStatus = 'ok' | 'error';

export interface HealthStatus {
  postgres: DatabaseStatus;
  mongodb: DatabaseStatus;
}

/**
 * Port: checks that the databases respond.
 * Implemented in infrastructure/adapter/HealthCheckerAdapter.ts.
 */
export abstract class HealthChecker {
  abstract check(): Promise<HealthStatus>;
}
