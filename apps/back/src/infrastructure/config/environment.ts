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
  /** Signs the access tokens (JWT) of the native app. */
  JWT_ACCESS_SECRET: string;
  /** Signs the access tokens (JWT) of the back-office. Different from JWT_ACCESS_SECRET. */
  JWT_ADMIN_SECRET: string;
  /** Key used to hash SMS codes and refresh tokens before they are stored. */
  HASH_SECRET: string;
  /** "log": SMS are written in the server logs (local development). */
  SMS_PROVIDER: SmsProvider;
  /** Folder where uploaded files (profile photos) are written. */
  UPLOADS_DIR: string;
  /** Folder of the private files (driver licences, selfies): only reachable through temporary links. */
  PRIVATE_UPLOADS_DIR: string;
  /** Public address of the API, used to build the links of uploaded files. */
  PUBLIC_BASE_URL: string;
  /** Mapbox token of the back (routes, place search). Never sent to the app. */
  MAPBOX_ACCESS_TOKEN: string;
}

export type SmsProvider = 'log';

const SMS_PROVIDERS: readonly SmsProvider[] = ['log'];
const SECRET_VARIABLES = ['JWT_ACCESS_SECRET', 'JWT_ADMIN_SECRET', 'HASH_SECRET'] as const;
const REQUIRED_VARIABLES = ['DATABASE_URL', 'MONGODB_URI', 'MAPBOX_ACCESS_TOKEN', ...SECRET_VARIABLES] as const;
/** Mapbox tokens start with pk. (public) or sk. (secret). */
const MAPBOX_TOKEN_FORMAT = /^(pk|sk)\.[\w.-]{20,}$/;
const MIN_SECRET_LENGTH = 32;
const DEFAULT_CORS_ORIGINS = 'http://localhost:4200';
const DEFAULT_PORT = '3000';

export function validateEnvironment(config: Record<string, unknown>): Environment {
  const missing = REQUIRED_VARIABLES.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing variables in apps/back/.env: ${missing.join(', ')}. ` +
        'Copy apps/back/.env.example to apps/back/.env and fill it in.',
    );
  }

  const weakSecrets = SECRET_VARIABLES.filter((key) => readString(config, key).length < MIN_SECRET_LENGTH);
  if (weakSecrets.length > 0) {
    throw new Error(`${weakSecrets.join(', ')} must be at least ${MIN_SECRET_LENGTH} characters long.`);
  }
  if (new Set(SECRET_VARIABLES.map((key) => readString(config, key))).size < SECRET_VARIABLES.length) {
    // Same secret for the app and the back-office: an app token could open the back-office.
    throw new Error(`${SECRET_VARIABLES.join(', ')} must all be different.`);
  }

  if (!MAPBOX_TOKEN_FORMAT.test(readString(config, 'MAPBOX_ACCESS_TOKEN'))) {
    throw new Error('MAPBOX_ACCESS_TOKEN does not look like a Mapbox token (it starts with pk. or sk.).');
  }

  const smsProvider = readString(config, 'SMS_PROVIDER', 'log');
  if (!isSmsProvider(smsProvider)) {
    throw new Error(`SMS_PROVIDER must be one of: ${SMS_PROVIDERS.join(', ')}.`);
  }
  const nodeEnv = readString(config, 'NODE_ENV', 'development');
  if (nodeEnv === 'production' && smsProvider === 'log') {
    // The logs would contain every sign-in code.
    throw new Error('SMS_PROVIDER=log is for local development only: set a real SMS provider in production.');
  }

  const port = readString(config, 'PORT', DEFAULT_PORT);
  return {
    NODE_ENV: nodeEnv,
    PORT: Number(port),
    DATABASE_URL: readString(config, 'DATABASE_URL'),
    MONGODB_URI: readString(config, 'MONGODB_URI'),
    DB_MIGRATIONS_RUN: readString(config, 'DB_MIGRATIONS_RUN', 'false') === 'true',
    CORS_ORIGINS: readString(config, 'CORS_ORIGINS', DEFAULT_CORS_ORIGINS)
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
    JWT_ACCESS_SECRET: readString(config, 'JWT_ACCESS_SECRET'),
    JWT_ADMIN_SECRET: readString(config, 'JWT_ADMIN_SECRET'),
    HASH_SECRET: readString(config, 'HASH_SECRET'),
    SMS_PROVIDER: smsProvider,
    UPLOADS_DIR: readString(config, 'UPLOADS_DIR', 'apps/back/uploads'),
    PRIVATE_UPLOADS_DIR: readString(config, 'PRIVATE_UPLOADS_DIR', 'apps/back/private-uploads'),
    MAPBOX_ACCESS_TOKEN: readString(config, 'MAPBOX_ACCESS_TOKEN'),
    PUBLIC_BASE_URL: readString(config, 'PUBLIC_BASE_URL', `http://localhost:${port}`).replace(/\/$/, ''),
  };
}

function isSmsProvider(value: string): value is SmsProvider {
  return (SMS_PROVIDERS as readonly string[]).includes(value);
}

/** Values from .env are strings; anything else falls back to the default. */
function readString(config: Record<string, unknown>, key: string, fallback = ''): string {
  const value = config[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}
