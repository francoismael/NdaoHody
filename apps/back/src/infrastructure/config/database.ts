import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';

/**
 * PostgreSQL (+ PostGIS): source of truth, holds all business data.
 * Tables are never created automatically (synchronize: false):
 * they come from donnees.sql, then from migrations.
 */
export const PostgresConnection = TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres' as const,
    url: config.getOrThrow<string>('DATABASE_URL'),
    autoLoadEntities: true,
    synchronize: false,
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
