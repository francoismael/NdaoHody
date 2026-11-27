import { Body, Controller, Get, Header, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { readWhatsAppStatuses } from '../../application/helper/readWhatsAppStatuses';
import { HandleWhatsAppStatusUseCase } from '../../application/usecases/auth/HandleWhatsAppStatusUseCase';
import { DomainException } from '../../domain/exception/DomainException';
import { WhatsAppSignatureGuard } from '../guard/WhatsAppSignatureGuard';

/**
 * Webhook of the WhatsApp Cloud API: /api/webhooks/whatsapp (outside /v1, called by Meta only).
 * GET: subscription check when the URL is saved in the Meta console.
 * POST: delivery statuses of the messages (a "failed" sign-in code is sent again by SMS).
 */
@ApiExcludeController()
@SkipThrottle() // Meta sends statuses in bursts, from a few addresses
@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly verifyToken: string;

  constructor(
    config: ConfigService,
    private readonly handleStatuses: HandleWhatsAppStatusUseCase,
  ) {
    this.verifyToken = config.get<string>('WHATSAPP_WEBHOOK_VERIFY_TOKEN') ?? '';
  }

  @Get()
  @Header('Content-Type', 'text/plain')
  verify(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ): string {
    if (mode !== 'subscribe' || !this.verifyToken || token !== this.verifyToken || !challenge) {
      throw new DomainException('forbidden', 'Vérification du webhook refusée.');
    }
    return challenge;
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(WhatsAppSignatureGuard)
  receive(@Body() payload: unknown): void {
    // Meta expects a quick 200: the statuses are handled after the answer (errors are logged by the use case).
    void this.handleStatuses.execute(readWhatsAppStatuses(payload));
  }
}
