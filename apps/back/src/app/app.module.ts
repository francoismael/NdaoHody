import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, RouterModule } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminApiModule } from '../api/admin-api.module';
import { ClientApiModule } from '../api/client-api.module';
import { HealthController } from '../api/controller/health.controller';
import { HealthChecker } from '../application/port/health-checker';
import { HealthCheckerAdapter } from '../infrastructure/adapter/health-checker.adapter';
import { MongoConnection, PostgresConnection } from '../infrastructure/config/database';
import { validateEnvironment } from '../infrastructure/config/environment';
import { AppController } from './app.controller';
import { AppService } from './app.service';

/** Default rate limit for every route: 100 requests per minute and per IP. Stricter limits go on sensitive routes. */
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
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // port (application) -> adapter (infrastructure)
    { provide: HealthChecker, useClass: HealthCheckerAdapter },
  ],
})
export class AppModule {}
