/**
 * Environment variables of the back, read from apps/back/.env.
 * The server refuses to start when a required variable is missing.
 */
export interface Environment {
  PORT: number;
  DATABASE_URL: string;
  MONGODB_URI: string;
}

const REQUIRED_VARIABLES = ['DATABASE_URL', 'MONGODB_URI'] as const;

export function validateEnvironment(config: Record<string, unknown>): Environment {
  const missing = REQUIRED_VARIABLES.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing variables in apps/back/.env: ${missing.join(', ')}. ` +
        'Copy apps/back/.env.example to apps/back/.env and fill it in.',
    );
  }

  return {
    PORT: Number(config['PORT'] ?? 3000),
    DATABASE_URL: String(config['DATABASE_URL']),
    MONGODB_URI: String(config['MONGODB_URI']),
  };
}
