/**
 * Environment variables of the back, read from apps/back/.env.
 * The server refuses to start when a required variable is missing.
 */
export interface Environment {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  MONGODB_URI: string;
  /** true: pending migrations are applied when the back starts (local development). */
  DB_MIGRATIONS_RUN: boolean;
  /** Web origins allowed to call the API (back-office). The native app sends no origin. */
  CORS_ORIGINS: string[];
}

const REQUIRED_VARIABLES = ['DATABASE_URL', 'MONGODB_URI'] as const;
const DEFAULT_CORS_ORIGINS = 'http://localhost:4200';

export function validateEnvironment(config: Record<string, unknown>): Environment {
  const missing = REQUIRED_VARIABLES.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing variables in apps/back/.env: ${missing.join(', ')}. ` +
        'Copy apps/back/.env.example to apps/back/.env and fill it in.',
    );
  }

  return {
    NODE_ENV: readString(config, 'NODE_ENV', 'development'),
    PORT: Number(readString(config, 'PORT', '3000')),
    DATABASE_URL: readString(config, 'DATABASE_URL'),
    MONGODB_URI: readString(config, 'MONGODB_URI'),
    DB_MIGRATIONS_RUN: readString(config, 'DB_MIGRATIONS_RUN', 'false') === 'true',
    CORS_ORIGINS: readString(config, 'CORS_ORIGINS', DEFAULT_CORS_ORIGINS)
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
  };
}

/** Values from .env are strings; anything else falls back to the default. */
function readString(config: Record<string, unknown>, key: string, fallback = ''): string {
  const value = config[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}
