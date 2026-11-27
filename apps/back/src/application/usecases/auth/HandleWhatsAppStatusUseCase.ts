import { Injectable, Logger } from '@nestjs/common';
import { OtpCodeRepository } from '../../../domain/repository/OtpCodeRepository';
import { bestEffort } from '../../helper/bestEffort';
import type { WhatsAppMessageStatus } from '../../helper/readWhatsAppStatuses';
import { Clock } from '../../port/Clock';
import { OtpIssuerService } from '../../service/OtpIssuerService';

/**
 * Delivery statuses sent by Meta (POST /api/webhooks/whatsapp).
 * A sign-in code that could not be delivered on WhatsApp is cancelled and a new code goes by SMS,
 * without the 60 s delay but within the 5 codes per day. Meta may send the same status
 * several times: only the first one counts.
 */
@Injectable()
export class HandleWhatsAppStatusUseCase {
  private readonly logger = new Logger(HandleWhatsAppStatusUseCase.name);

  constructor(
    private readonly otpCodes: OtpCodeRepository,
    private readonly issuer: OtpIssuerService,
    private readonly clock: Clock,
  ) {}

  async execute(statuses: readonly WhatsAppMessageStatus[]): Promise<void> {
    for (const status of statuses) {
      // One status that fails (SMS provider down...) must not stop the others.
      await bestEffort(this.logger, `WhatsApp status of ${status.messageId} not handled`, this.handle(status));
    }
  }

  private async handle({ messageId, status }: WhatsAppMessageStatus): Promise<void> {
    if (status !== 'failed') {
      return;
    }
    const otp = await this.otpCodes.findByWhatsAppMessageId(messageId);
    if (!otp) {
      return;
    }
    const now = this.clock.now();
    if (!(await this.otpCodes.recordDeliveryFailure(otp.id, now))) {
      return; // this status was already received
    }
    if (otp.dateUtilisation || otp.dateAnnulation || otp.dateExpiration <= now) {
      return;
    }
    if (await this.issuer.dailyLimitReached(otp.telephone, now)) {
      this.logger.warn(`Code ${otp.id} not delivered on WhatsApp, no SMS fallback: 5 codes already sent today.`);
      return;
    }
    await this.issuer.replaceBySms(otp, now);
  }
}
