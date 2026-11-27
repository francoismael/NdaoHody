import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app/AppModule';
import { DOCS_PATH, GLOBAL_PREFIX, setupHttpServer } from './infrastructure/config/http';

async function bootstrap(): Promise<void> {
  // rawBody: the WhatsApp webhook checks Meta's signature on the exact bytes received.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  setupHttpServer(app);

  const port = app.get(ConfigService).getOrThrow<number>('PORT');
  await app.listen(port);

  // Set when Nx waits for this server to be ready
  if (process.env['NX_READY_SIGNAL_SOCKET']) {
    try {
      // Function keeps TypeScript and bundlers from rewriting or bundling the import
      const load = new Function('s', 'return import(s)') as (s: string) => Promise<{ emitReadySignal(server: unknown): boolean }>;
      (await load('@nx/js/ready-signal')).emitReadySignal(app.getHttpServer());
    } catch {
      // @nx/js isn't installed
    }
  }

  Logger.log(`🚀 API running on http://localhost:${port}/${GLOBAL_PREFIX} · docs: http://localhost:${port}/${DOCS_PATH}`);
}

bootstrap();
