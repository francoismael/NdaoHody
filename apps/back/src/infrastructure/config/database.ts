import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildPostgresOptions } from '../persistence/postgres/postgresOptions';

/**
 * PostgreSQL (+ PostGIS): source of truth, holds all business data.
 * Tables are never created from the entities (synchronize: false): they come from migrations.
 * DB_MIGRATIONS_RUN=true applies pending migrations at startup (local development);
 * in production migrations run as a separate deployment step (npm run db:migrate).
 */
export const PostgresConnection = TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    ...buildPostgresOptions(config.getOrThrow<string>('DATABASE_URL')),
    migrationsRun: config.getOrThrow<boolean>('DB_MIGRATIONS_RUN'),
    autoLoadEntities: true,
    retryAttempts: 3,
    retryDelay: 2000,
  }),
});

/**
 * MongoDB: push notifications only (history, FCM tokens, sending queue).
 */
export const MongoConnection = MongooseModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    uri: config.getOrThrow<string>('MONGODB_URI'),
    serverSelectionTimeoutMS: 5000,
    retryAttempts: 3,
    retryDelay: 2000,
  }),
});
