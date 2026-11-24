import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from '../api/controller/health.controller';
import { HealthChecker } from '../application/port/health-checker';
import { HealthCheckerAdapter } from '../infrastructure/adapter/health-checker.adapter';
import { MongoConnection, PostgresConnection } from '../infrastructure/config/database';
import { validateEnvironment } from '../infrastructure/config/environment';
import { AppController } from './app.controller';
import { AppService } from './app.service';

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
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    // port (application) -> adapter (infrastructure)
    { provide: HealthChecker, useClass: HealthCheckerAdapter },
  ],
})
export class AppModule {}
