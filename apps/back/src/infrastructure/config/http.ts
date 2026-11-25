import { resolve } from 'path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { ApiExceptionFilter } from '../../api/filter/ApiExceptionFilter';
import { UPLOADS_URL_PATH } from '../adapter/LocalFileStorageAdapter';

export const GLOBAL_PREFIX = 'api';
export const DOCS_PATH = `${GLOBAL_PREFIX}/docs`;

/**
 * HTTP setup shared by every route: security headers, CORS, validation, error format and docs.
 */
export function setupHttpServer(app: NestExpressApplication): void {
  const config = app.get(ConfigService);
  const isProduction = config.getOrThrow<string>('NODE_ENV') === 'production';

  app.setGlobalPrefix(GLOBAL_PREFIX);

  // Swagger UI needs inline scripts, and it is only served outside production.
  // cross-origin: the back-office (another origin) shows the profile photos served below.
  app.use(helmet({ contentSecurityPolicy: isProduction ? undefined : false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  app.enableCors({ origin: config.getOrThrow<string[]>('CORS_ORIGINS'), credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // drops unknown fields
      forbidNonWhitelisted: true, // ...and rejects the request when there are some
      transform: true, // turns query/body values into the DTO types
    }),
  );

  app.useGlobalFilters(new ApiExceptionFilter());

  // Profile photos written by LocalFileStorageAdapter (outside the /api prefix).
  app.useStaticAssets(resolve(process.cwd(), config.getOrThrow<string>('UPLOADS_DIR')), {
    prefix: `${UPLOADS_URL_PATH}/`,
    index: false,
    dotfiles: 'deny',
  });

  if (!isProduction) {
    setupSwagger(app);
  }
}

function setupSwagger(app: INestApplication): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('NdaoHody API')
      .setDescription('Native app routes: /api/v1 · Back-office routes: /api/admin')
      .setVersion('1.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup(DOCS_PATH, app, document);
}
