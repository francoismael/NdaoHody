import type { DataSourceOptions } from 'typeorm';
import { MIGRATIONS } from './migrations';

type PostgresConnectionOptions = Extract<DataSourceOptions, { type: 'postgres' }>;

/**
 * PostgreSQL options shared by the NestJS app and the command-line scripts
 * (db:migrate, db:revert, db:seed), so both always use the same migrations.
 */
export function buildPostgresOptions(url: string): PostgresConnectionOptions {
  return {
    type: 'postgres',
    url,
    migrations: MIGRATIONS,
    migrationsTableName: 'migrations',
    synchronize: false,
  };
}
