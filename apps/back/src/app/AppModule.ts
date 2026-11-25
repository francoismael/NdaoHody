import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, RouterModule } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdminApiModule } from '../api/AdminApiModule';
import { ClientApiModule } from '../api/ClientApiModule';
import { FilesController } from '../api/controller/FilesController';
import { HealthController } from '../api/controller/HealthController';
import { AccountThrottlerGuard } from '../api/guard/AccountThrottlerGuard';
import { MongoConnection, PostgresConnection } from '../infrastructure/config/database';
import { validateEnvironment } from '../infrastructure/config/environment';
import { InfrastructureModule } from '../infrastructure/InfrastructureModule';

/**
 * Default rate limit for every route: 100 requests per minute, per account when signed in, per IP otherwise.
 * Stricter limits go on sensitive routes.
 */
const DEFAULT_RATE_LIMIT = { ttl: 60_000, limit: 100 };

@Module({
  imports: [
    // apps/back/.env (nx commands run from the repository root)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(process.cwd(), 'apps/back/.env')],
      validate: validateEnvironment,
    }),
    PostgresConnection,
    MongoConnection,
    InfrastructureModule,
    ThrottlerModule.forRoot({
      throttlers: [DEFAULT_RATE_LIMIT],
      errorMessage: 'Trop de requêtes. Réessaie dans une minute.',
    }),
    ClientApiModule,
    AdminApiModule,
    // /api/v1/... for the native app, /api/admin/... for the back-office
    RouterModule.register([
      { path: 'v1', module: ClientApiModule },
      { path: 'admin', module: AdminApiModule },
    ]),
  ],
  controllers: [HealthController, FilesController],
  providers: [{ provide: APP_GUARD, useClass: AccountThrottlerGuard }],
})
export class AppModule {}
