import { Module } from '@nestjs/common';
import { OtpIssuerService } from '../application/service/OtpIssuerService';
import { HandleWhatsAppStatusUseCase } from '../application/usecases/auth/HandleWhatsAppStatusUseCase';
import { WhatsAppWebhookController } from './controller/WhatsAppWebhookController';
import { WhatsAppSignatureGuard } from './guard/WhatsAppSignatureGuard';

/**
 * Routes called by outside services, served under /api/webhooks (no /v1: their address is saved
 * in the service's console and must not change with the app's API version).
 */
@Module({
  controllers: [WhatsAppWebhookController],
  providers: [WhatsAppSignatureGuard, OtpIssuerService, HandleWhatsAppStatusUseCase],
})
export class WebhookApiModule {}
