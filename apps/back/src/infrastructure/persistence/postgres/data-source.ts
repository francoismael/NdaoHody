import { join } from 'path';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { buildPostgresOptions } from './postgres-options';

/**
 * Data source used by the TypeORM command line (npm run db:migrate / db:revert)
 * and by the seed script. It reads DATABASE_URL from apps/back/.env.
 */
config({ path: join(process.cwd(), 'apps/back/.env') });

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('DATABASE_URL is missing in apps/back/.env (see apps/back/.env.example).');
}

export default new DataSource(buildPostgresOptions(databaseUrl));
